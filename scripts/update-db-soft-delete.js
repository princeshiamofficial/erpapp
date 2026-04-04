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
        console.log('Adding soft delete columns to orders table...');
        await pool.execute('ALTER TABLE orders ADD COLUMN deleted_at DATETIME NULL, ADD COLUMN deleted_by_name VARCHAR(100) NULL');
        
        console.log('Adding soft delete columns to quotations table...');
        await pool.execute('ALTER TABLE quotations ADD COLUMN deleted_at DATETIME NULL, ADD COLUMN deleted_by_name VARCHAR(100) NULL');
        
        console.log('Database schema updated successfully.');
    } catch (e) {
        console.error('Error updating database schema:', e);
    } finally {
        await pool.end();
    }
}
run();
