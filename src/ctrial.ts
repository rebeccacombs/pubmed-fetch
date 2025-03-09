import axios from "axios";

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

const sirnaDrugs = ["patisiran", "givosiran", "lumasiran", "inclisiran", "nedosiran", "vutisiran"];

export async function fetchTrialsForDrugs(): Promise<any[]> {
    let allTrials: any[] = [];

    try {
        for (const drug of sirnaDrugs) {
            console.log(`Fetching trials for: ${drug}`);

            const response = await axios.get(BASE_URL, {
                params: { "query.intr": drug } 
            });

            const data = response.data;

            if (data.studies && Array.isArray(data.studies)) {
                const trials = data.studies.map((study: { protocolSection: {
                    statusModule: any; identificationModule: { briefTitle: any; }; conditionsModule: { conditions: any; keywords: any; }; interventionsModule: { interventions: any[]; }; descriptionModule: { briefSummary: any; }; 
}; }) => ({
                    title: study.protocolSection?.identificationModule?.briefTitle || "No title",
                    status: study.protocolSection?.statusModule?.overallStatus || "Unknown",
                    conditions: study.protocolSection?.conditionsModule?.conditions || [],
                    interventions: study.protocolSection?.interventionsModule?.interventions?.map((i: { interventionName: any; }) => i.interventionName) || [],
                    keywords: study.protocolSection?.conditionsModule?.keywords || [],
                    summary: study.protocolSection?.descriptionModule?.briefSummary || "No summary available"
                }));

                allTrials.push(...trials);
            }
        }

        console.log("Extracted Trials:", allTrials);
        return allTrials;
    } catch (error) {
        console.error("Error fetching trials:", error);
    }

    return allTrials;
}

fetchTrialsForDrugs();
