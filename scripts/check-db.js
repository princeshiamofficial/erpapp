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
        const [results] = await pool.execute('DESCRIBE orders');
        console.log('Orders Table:', results);
        const [qresults] = await pool.execute('DESCRIBE quotations');
        console.log('Quotations Table:', qresults);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
