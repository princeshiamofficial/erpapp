
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM follow_ups');
    console.log(`Row count in follow_ups: ${rows[0].count}`);
    await connection.end();
}
checkData();
