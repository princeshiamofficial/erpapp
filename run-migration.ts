
import { migrateApiToMySQL } from './src/lib/migration-service';

async function runMigration() {
    console.log("Starting full migration...");
    try {
        const results = await migrateApiToMySQL();
        console.log("Migration complete!");
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

runMigration();
