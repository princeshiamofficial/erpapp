
import { fetchFromApiV3 } from './src/lib/api-helper2';
import * as fs from 'fs';

async function testCollections() {
    try {
        const collections = await fetchFromApiV3('/collections');
        console.log(`Found ${collections.length} collections`);
        fs.writeFileSync('api_collections.json', JSON.stringify(collections, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testCollections();
