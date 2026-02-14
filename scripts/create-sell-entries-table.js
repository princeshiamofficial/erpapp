const mysql = require('mysql2/promise');
require('dotenv').config();

async function createSellEntriesTable() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306')
    });

    try {
        console.log('Creating sell_entries table...');

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS \`sell_entries\` (
              \`id\` VARCHAR(36) PRIMARY KEY,
              \`data_json\` JSON NOT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX \`idx_created_at\` (\`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await connection.execute(createTableSQL);
        console.log('✅ Table "sell_entries" created successfully!');

        // Verify the table was created
        const [rows] = await connection.execute('SHOW TABLES LIKE "sell_entries"');
        if (rows.length > 0) {
            console.log('✅ Table verified in database.');
        }

    } catch (error) {
        console.error('❌ Error creating table:', error);
        throw error;
    } finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}

createSellEntriesTable()
    .then(() => {
        console.log('\n✨ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
