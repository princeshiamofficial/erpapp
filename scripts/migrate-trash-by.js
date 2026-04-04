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
    try {
        console.log('Adding deleted_by_id and deleted_by_name to orders table...');
        await pool.execute('ALTER TABLE orders ADD COLUMN deleted_by_id VARCHAR(255) DEFAULT NULL');
        await pool.execute('ALTER TABLE orders ADD COLUMN deleted_by_name VARCHAR(255) DEFAULT NULL');
        console.log('Done with orders table.');

        console.log('Adding deleted_by_id and deleted_by_name to quotations table...');
        await pool.execute('ALTER TABLE quotations ADD COLUMN deleted_by_id VARCHAR(255) DEFAULT NULL');
        await pool.execute('ALTER TABLE quotations ADD COLUMN deleted_by_name VARCHAR(255) DEFAULT NULL');
        console.log('Done with quotations table.');
    } catch (e) {
        console.error('Error during migration:', e.message);
    } finally {
        await pool.end();
    }
}
run();
