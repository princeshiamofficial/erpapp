
import { fetchFromApiV3 } from './src/lib/api-helper2';
import * as fs from 'fs';

async function inspectLeads() {
    try {
        console.log("Inspecting 'leads'...");
        const response = await fetchFromApiV3('/collections/leads/documents?limit=1');
        if (response.documents && response.documents.length) {
            fs.writeFileSync('lead_sample.json', JSON.stringify(response.documents[0].data, null, 2));
            console.log("Sample written to lead_sample.json");
        } else {
            console.log("No leads found.");
        }
    } catch (e) {
        console.error(e);
    }
}

inspectLeads();
