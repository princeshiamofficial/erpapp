require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const pool = mysql.createPool({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });

    const addColumnIfNotExists = async (table, column, definition) => {
        try {
            console.log(`Checking column '${column}' in table '${table}'...`);
            const [rows] = await pool.execute(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
                [table, column]
            );
            if (rows.length === 0) {
                console.log(`Adding column '${column}' to ${table}...`);
                await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`Column '${column}' added.`);
            } else {
                console.log(`Column '${column}' already exists in ${table}.`);
            }
        } catch (e) {
            console.error(`Error with column '${column}' on table '${table}':`, e.message);
        }
    };

    try {
        const tables = ['orders', 'quotations'];
        for (const table of tables) {
            console.log(`\nProcessing table: ${table}`);
            await addColumnIfNotExists(table, 'is_deleted', 'BOOLEAN DEFAULT FALSE');
            await addColumnIfNotExists(table, 'deleted_at', 'DATETIME DEFAULT NULL');
            await addColumnIfNotExists(table, 'deleted_by_id', 'VARCHAR(255) DEFAULT NULL');
            await addColumnIfNotExists(table, 'deleted_by_name', 'VARCHAR(255) DEFAULT NULL');
        }
        console.log('\nMigration completed successfully!');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await pool.end();
    }
}
run();
