
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });

    // Drop existing table if it exists
    await connection.execute('DROP TABLE IF EXISTS follow_ups');

    // Create new follow_ups table
    await connection.execute(`
        CREATE TABLE follow_ups (
            id VARCHAR(255) PRIMARY KEY,
            lead_id VARCHAR(255),
            business_name VARCHAR(255),
            contact_name VARCHAR(255),
            phone VARCHAR(50),
            status VARCHAR(50),
            crm_id VARCHAR(255),
            data_json LONGTEXT
        )
    `);

    console.log("Table 'follow_ups' recreated with correct schema.");
    await connection.end();
}
migrate();
