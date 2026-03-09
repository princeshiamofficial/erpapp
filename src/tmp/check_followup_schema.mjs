
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });
    const [rows] = await connection.execute('SHOW COLUMNS FROM follow_ups');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
}
checkSchema();
