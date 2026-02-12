import { fetchFromApiV3 } from './src/lib/api-helper2';
import * as fs from 'fs';

async function inspectShippedOrders() {
    try {
        console.log("Inspecting 'shippedOrders' (multiple)...");
        const response = await fetchFromApiV3('/collections/shippedOrders/documents?limit=10');
        if (response.documents && response.documents.length) {
            fs.writeFileSync('shipped_inspect.json', JSON.stringify(response.documents, null, 2));
            console.log("Saved to shipped_inspect.json");
        } else {
            console.log("No shipped orders found.");
        }
    } catch (e) {
        console.error(e);
    }
}

inspectShippedOrders();
