const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const config = {
            host: process.env.DATABASE_HOST,
            user: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
            port: process.env.DATABASE_PORT || 3306
        };
        console.log("Connecting with:", { ...config, password: '***' });
        const connection = await mysql.createConnection(config);
        const [rows] = await connection.query('SHOW TABLES');
        console.log("Tables in database:");
        rows.forEach(row => console.log("-", Object.values(row)[0]));
        await connection.end();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

check();
