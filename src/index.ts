import axios from 'axios';
import xml2js from 'xml2js';

const BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"

/*
const api_key = process.env.NCBI_API_KEY
const authors = ['']
const topics = ['RNAi', "siRNA", "ASO", "mRNA"]
const dateRange = '("2024/09/19"[Date - Create] : "2024/10/15"[Date - Create])'
const query = buildQuery(authors, topics, dateRange)
const ret = getIDsAndData(query, 15, api_key, true);
console.log(ret)
*/

// paper data object
type PaperData = {
    PMID: number;
    title: string;
    slug: string;
    abstract: string;
    authors: string[];
    journal: string;
    pubdate: Date;
    keywords: string[];
    url: string;
    affiliations: string[];
};

// main: query of interested paper topics -> prepped data
export default async function getIDsAndData(query: string, numPapers: number, api_key: string | undefined, consolelog: boolean): Promise<Array<PaperData>> {
    try {
        const idList = await fetchIDs(query, numPapers, api_key, false);

        if (idList && idList.length > 0) {
            const data = await fetchData(idList, api_key, false);
            const processedData = await processData(data);
            if (consolelog) { console.log(processedData) }
            return processedData
        }
        return []
    } catch (error) {
        console.error("Error during fetch process: ", error);
        return []
    }
}

// getting PMIDs based on query
export async function fetchIDs(query: string, num: number, api_key: string | undefined, consolelog: boolean): Promise<string[]> {
    let idList: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await axios.get(`${BASE_URL}esearch.fcgi?db=pubmed&term=${query}&retmax=${num}&retmode=json&api_key=${api_key}`);
            idList = response.data.esearchresult.idlist;

            if (consolelog) { console.log(idList) }

            return idList;
        } catch (error) {
            console.error(`Error searching IDs, attempt ${attempt + 1}/3. Trying again.`);
            await delay(1000 * Math.pow(2, attempt)); // Exponential backoff
        }
    }
    return idList;
}

// getting raw paper data based on PMIDs
export async function fetchData(id_list: any, api_key: string | undefined, consolelog: boolean): Promise<any> { //efetches
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await axios.get(`${BASE_URL}efetch.fcgi?db=pubmed&id=${id_list}&retmode=xml&api_key=${api_key}`)
            const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true, explicitCharkey: true });
            const ret = await parser.parseStringPromise(response.data);
            if (consolelog) { console.log(ret) }
            return ret;
        } catch (error) {
            console.error(`Error fetching ID data (status 400) ${attempt + 1}/3. Trying again.`);
            await delay(1000 * Math.pow(2, attempt));
        }
    }
}

// formatting raw paper data with interested fields 
export async function processData(data: any): Promise<Array<PaperData>> {
    try {
        const pData = data.PubmedArticleSet.PubmedArticle.map((article: any) => {
            try {
                return {
                    PMID: dataTools.getPMID(article.MedlineCitation.PMID._),
                    title: article.MedlineCitation.Article.ArticleTitle._,
                    slug: dataTools.getSlug(article.MedlineCitation.Article.ArticleTitle._),
                    abstract: article.MedlineCitation.Article.Abstract.AbstractText._ || dataTools.getAbstractText(article.MedlineCitation.Article.Abstract.AbstractText),
                    authors: dataTools.getAuthors(article.MedlineCitation.Article.AuthorList.Author),
                    journal: article.MedlineCitation.Article.Journal.Title._,
                    pubdate: new Date(dataTools.getDate(article.MedlineCitation.Article.Journal.JournalIssue.PubDate)),
                    keywords: dataTools.getKeywords(article.MedlineCitation),
                    url: `https://www.ncbi.nlm.nih.gov/pubmed/${article.MedlineCitation.PMID._}`,
                    affiliations: dataTools.getAffiliations(article.MedlineCitation.Article.AuthorList.Author)
                };
            } catch (articleError) {
                console.error("Error processing article:", article.MedlineCitation.PMID._, article.MedlineCitation.Article.AuthorList.Author[0].LastName._, articleError);
                return null;  // skip or return a fallback structure
            }
        }).filter((article: any) => article !== null);  // remove any null articles
        return pData;

    } catch (error) {
        console.error("Error processing data:", error);
        return [];  // return empty array in case of failure
    }
}

// helper functions for cleaning raw paper data 
const dataTools = {
    getPMID(entry: any): number { // entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.PMID._
        return Number(entry)
    },
    getSlug(title: any): string { //entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.Article.ArticleTitle._
        let slug = title.toLowerCase();
        slug = slug.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
        return slug;
    },
    getAbstractText(entry: any): string { //entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.Article.Abstract.AbtractText
        const text = entry.map((text: { _: string }) => {
            const piece = text._ || '';
            return `${piece}`.trim();
        })
        return text.join(" ")
    },
    getAuthors(entry: any): string[] { //entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.Article.AuthorList.Author
        const authors = entry.map((author: { LastName: { _: string; }; ForeName: { _: string; }; }) => {
            try {
                const lastName = author?.LastName?._.trim() || '';
                const foreName = author?.ForeName?._.trim() || '';

                if (lastName && foreName) {
                    return `${lastName} ${foreName}`;
                }
            } catch (authorError) {
                console.error("Error processing author:", author, authorError);
            }
        }).filter((name: string) => name);
        return authors
    },
    getDate(entry: any): string { //entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.Article.Journal.JournalIssue.PubDate
        if (entry.Year && entry.Year._) {
            const year = entry.Year._
            const month = (entry.Month && entry.Month._) || 'Jan';
            const day = (entry.Day && entry.Day._) || '01';
            return `${year}-${month}-${day}`.trim();
        } else {
            return "0000-Jan-01"
        }
    },
    getKeywords(entry: any): string[] { //entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.KeywordList.Keyword
        if (entry.KeywordList) {
            const keywords = entry.KeywordList.Keyword.map((keyword: { _: string }) => {
                const k = keyword._ || '';
                return `${k}`.trim();
            })
            return keywords
        }
        return []
    },
    getAffiliations(entry: any): string[] { // entry = data.PubmedArticleSet.PubmedArticle[IDX].MedlineCitation.Article.AuthorList.Author
        const affiliations = new Set<string>();
        for (const author of entry) {
            if (author?.AffiliationInfo && author.AffiliationInfo.Affiliation) {
                const affiliation = author.AffiliationInfo.Affiliation?._.trim();
                if (affiliation) {
                    affiliations.add(affiliation);
                }
            }
        }
        const uniqueAffiliationsArray = Array.from(affiliations);
        return uniqueAffiliationsArray;
    }
}

// building the query string based on user input 
export function buildQuery(authors: string[], topics: string[], dateRange: string): string {
    let queries: string[] = [];

    if (authors && authors.length > 0) {
        const authorQueries = authors.map(author => `${author}[Author]`);
        queries.push('(' + authorQueries.join(' OR ') + ')');
    }

    if (topics && topics.length > 0) {
        const topicQueries = topics.map(topic => `${topic}[Title/Abstract]`);
        queries.push('(' + topicQueries.join(' OR ') + ')');
    }
    return queries.join(' AND ') + ' AND ' + dateRange;
}

// error retry timer
async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}