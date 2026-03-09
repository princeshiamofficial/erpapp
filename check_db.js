const mysql = require('mysql2/promise');
async function run() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        database: 'erp_database',
        password: ''
    });
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.log("Tables:", JSON.stringify(rows.map(r => Object.values(r)[0])));

        const [leadCols] = await pool.query('DESCRIBE leads');
        console.log("Leads Columns:", JSON.stringify(leadCols));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}
run();
