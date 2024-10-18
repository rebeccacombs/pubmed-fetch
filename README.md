# pubmed-fetch
an npm package which acts as a typescript version of [Bio.Entrez](https://biopython.org/docs/1.76/api/Bio.Entrez.html) -- automating PubMed article and manuscript data retrivial.  
the majority of functions are asynchronous, using [axios](https://github.com/axios/axios) to perform the fetches from pubmed 
the main purpose of this package is to grab pubmed data to move into a database, which is why all of it pertains to logging in the console. 

all functions can be found in [`src/index.ts`](https://github.com/rebeccacombs/pubmed-fetch/blob/master/src/index.ts).
<br>
<br> 


## installation 
through npm package manager -- please make sure you have [Node.js](https://nodejs.org/en/download/package-manager) installed before installation. 
```
npm i pubmed-fetch
```
<br>

## getting started 

you will need to create an NCBI account to obtain an API key from them if you would like to fetch papers quicker; also apparently this is needed if you don't want to get IP banned from fetching too many papers too fast.

key typically found at: https://account.ncbi.nlm.nih.gov/settings/ 
```index.ts
const api_key = process.env.NCBI_API_KEY
```
```.env
NCBI_API_KEY = "your_api_key"
```
NOTE: currently an NCBI API key is *needed* for the functions to work  

<br>

## building a query using [`buildQuery()`](#building-a-query-using-buildquery)

at the top of your file, you will need to define three consts, a `string[]` of author names, a `string[]` of topics, and a `string` for the date range
```index.ts
const authors = ['']
const topics = ['']
const dateRange = ''
```
these can all be left empty, however here is an example: 
```index.ts
const authors = ["Luca Pinello", "David Stein", "Huidong Chen"]
const topics = ["cells", "scRNA", "bioinformatics"]
const dateRange = '("2024/09/19"[Date - Create] : "2024/10/15"[Date - Create])'
```

[`buildQuery()`](#building-a-query-using-buildquery) is simply concatenating them together using pubmed search logic to add into an eventual query command: 
```index.ts
const query = buildQuery(authors, topics, dateRange);
```
a `console.log(query)` should result in something like this:   
```
(Luca Pinello[Author] OR David Stein[Author] OR Huidong Chen[Author]) AND (cells[Title/Abstract] OR scRNA[Title/Abstract] OR bioinformatics[Title/Abstract]) AND ("2024/09/19"[Date - Create] : "2024/10/15"[Date - Create])
```
<br>

## obtaining fully formatted paper results using [`getIDsAndData()`](#obtaining-fully-formatted-paper-results-using-getidsanddata)
can be called in your file like in this: 
```index.ts
const ret = getIDsAndData(query, 15, api_key, true);
```
where `15` would the maximum number of returned papers (i think the maximum currently is 10,000), and `true` indicates that you want the results to be logged to the console. 

calling this function will use pubmed's esearch and efetch functions based of your `query`, then the outputted console xml is formatted into an array of PaperData objects (see [`processData()`](#understanding-processdata) for formatting details).
<br>

here is what an example would look like in your console: 
```
[
  {
      PMID: 39406691,
      title: 'Azithromycin induces liver injury in mice by targeting the AMPK/Nrf2 pathway.',
      slug: 'azithromycin-induces-liver-injury-in-mice-by-targeting-the-ampknrf2-pathway',
      abstract: "Azithromycin is an antibacterial and anti-inflammatory drug widely used for the treatment of various diseases, including those caused by atypical pathogens, bacterial or viral infections, chronic sinusitis, and bronchial asthma, particularly in pediatric patients. However, concerns have emerged regarding its hepatotoxicity and its precise mechanism of action remains unclear. To investigate the molecular mechanisms responsible for azithromycin-induced acute liver injury to advance our understanding of the progression and pathogenesis of antibiotic-induced liver damage, and to improve prevention and treatment strategies. C57BL/6 mice, Nrf2 mice, and primary hepatocytes were used. Primary hepatocytes from mice were isolated using a two-step perfusion method and cultured  the 'sandwich' culture model. The exposure to azithromycin resulted in increased apoptosis and reactive oxygen species (ROS) levels. In mouse models, intraperitoneal administration of azithromycin at varying concentrations and time points substantially induced hepatic disarray, swelling, and dysfunction. Azithromycin markedly upregulated the mRNA and protein levels of phosphorylated adenosine-activated protein kinase (AMPK) while downregulating nuclear factor erythroid 2-related factor 2 (Nrf2), heme oxygenase 1 (HO-1), and NADPH: quinone oxidoreductase 1 (NQO-1). Moreover, HO-1 and NQO-1 protein levels remained largely unaffected in primary hepatocytes co-cultured with azithromycin in Nrf2 mice. Our findings suggest that azithromycin-induced acute liver injury is mediated by suppression of Nrf2 activation and ROS production. This sheds light on the potential mechanisms involved in azithromycin-induced liver damage, underscoring the importance of exploring targeted interventions to mitigate the hepatotoxic effects.",
      authors: [
        'Xu Qixiang',
        'Zhang Cuifeng',
        'Lu Jingwen',
        'Qian Haiyi',
        'Wang Xiaodong',
        'Guo Wenjun',
        'Cheng Huixian'
      ],
      journal: 'Immunopharmacology and immunotoxicology',
      pubdate: 2024-10-14T16:00:00.000Z,
      keywords: [
        'Azithromycin',
        'acute liver injury',
        'adenosine-activated protein kinase',
        'nuclear factor erythroid 2-related factor 2',
        'primary hepatocytes'
      ],
      url: 'https://www.ncbi.nlm.nih.gov/pubmed/39406691',
      affiliations: [ 'School of Pharmacology, Wannan Medical College, Wuhu, China.' ]
    }
]
```
<br>

## getting a list of PMIDs with [`fetchIDs()`](#getting-a-list-of-pmids-with-fetchids)
a function that is called within [`getIDsAndData()`](#obtaining-fully-formatted-paper-results-using-getidsanddata), returns a list of PMIDs based off the query utilizing pubmed's [esearch](https://www.ncbi.nlm.nih.gov/books/NBK25499/) fetching option.
here as an example: 
```index.ts
const idList = fetchIDs(query, 15, api_key, true)
```
where `console.log(idList)` could look something like: 
```
<eSearchResult>
  <IdList>
    <Id>38390375</Id>
    <Id>39418647</Id>
    <Id>39418644</Id>
    <Id>39418643</Id>
    <Id>39418642</Id>
  </IdList>
</eSearchResult> 
```
<br>

## getting raw xml from idList using [`fetchData()`](#getting-raw-xml-from-idlist-using-fetchdata)
a function that is called within [`getIDsAndData()`](#obtaining-fully-formatted-paper-results-using-getidsanddata), returns raw xml data from list of PMIDs utilizing pubmed's [efetch](https://www.ncbi.nlm.nih.gov/books/NBK25499/) fetching option. unfortunately for the pubmed database, the only data format that can be outputted is xml, so i have used [xml2js](https://www.npmjs.com/package/xml2js) to format it slightly before actually processing it. 
here is an example: 
```index.ts
const rawData = fetchData(idList, api_key, true)
```
where `console.log(rawData)` could look something like: 
```
{
  PubmedArticleSet: {
    PubmedArticle: { MedlineCitation: [Object], PubmedData: [Object] }
  }
}
```
<br>

## understanding [`processData()`](#understanding-processdata)
this function takes the rawData outputted by [`fetchData()`](#getting-raw-xml-from-idlist-using-fetchdata) and processes each item into each attribute of the `PaperData` object: 
```
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
```
example output can be viewed under [`getIDsandData()`](#obtaining-fully-formatted-paper-results-using-getidsanddata) output  
<br>

---
this is v1.0 of my npm package! i am open to all pull requests, suggestions, or improvements to my code. it is in part of a larger project i am doing for university, so i may not get back in a timely manner as long as the package is working for my current needs. 
