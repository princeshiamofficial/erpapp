const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

async function migrateAttendanceSchema() {
    const pool = mysql.createPool({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0,
    });

    console.log('🚀 Starting Attendance Database Migration...');

    try {
        // 1. Alter hours_worked from DECIMAL to VARCHAR
        console.log('--- Modifying "hours_worked" column ---');
        await pool.execute('ALTER TABLE attendance_records MODIFY COLUMN hours_worked VARCHAR(20)');
        console.log('✅ "hours_worked" type changed to VARCHAR(20).');

        // 2. Increase location column length
        console.log('--- Modifying "location" column ---');
        await pool.execute('ALTER TABLE attendance_records MODIFY COLUMN location VARCHAR(255)');
        console.log('✅ "location" length increased to 255.');

        console.log('\n✨ Migration completed successfully.');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

migrateAttendanceSchema();
