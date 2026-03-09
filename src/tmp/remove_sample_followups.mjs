
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function removeSamples() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });

    const sampleNames = ["Apex Solutions", "Blue Ocean Ltd", "Delta Corp", "Echo Systems", "Creative Tech"];

    try {
        // Clear follow_ups (already done, but being thorough)
        await connection.execute(`DELETE FROM follow_ups`);
        console.log("Cleared follow_ups table.");

        // Also clear leads if any of these samples are there
        for (const name of sampleNames) {
            await connection.execute(`DELETE FROM leads WHERE business_name = ?`, [name]);
        }
        console.log("Cleared matching sample records from leads table.");

    } catch (error) {
        console.error("Error removing sample records:", error);
    } finally {
        await connection.end();
    }
}
removeSamples();
