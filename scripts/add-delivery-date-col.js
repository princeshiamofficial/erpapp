require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const config = {
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    };
    
    console.log(`Connecting to ${config.database} on ${config.host}...`);
    const connection = await mysql.createConnection(config);

    try {
        console.log('Adding accepted_delivery_date column to orders table...');
        // First check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM orders LIKE "accepted_delivery_date"');
        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE orders 
                ADD COLUMN accepted_delivery_date DATETIME NULL DEFAULT NULL;
            `);
            console.log('Migration successful.');
        } else {
            console.log('Column "accepted_delivery_date" already exists.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
