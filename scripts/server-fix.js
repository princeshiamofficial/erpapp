
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixServerDatabase() {
    console.log('--- Starting Database Fix for Daily Routine ---');

    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || '127.0.0.1',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });

    try {
        // 1. Check current schema
        const [cols] = await connection.execute('DESCRIBE daily_routine_entries');
        const hasUserIdInPK = cols.some(c => c.Field === 'user_id' && c.Key === 'PRI');

        if (!hasUserIdInPK) {
            console.log('Updating Primary Key for daily_routine_entries...');
            try {
                await connection.execute('ALTER TABLE daily_routine_entries DROP PRIMARY KEY');
            } catch (e) {
                console.log('Primary key already dropped or does not exist.');
            }
            await connection.execute('ALTER TABLE daily_routine_entries ADD PRIMARY KEY (id, user_id)');
            console.log('Successfully updated Primary Key to (id, user_id).');
        } else {
            console.log('Primary Key is already correct.');
        }

        // 2. Fix truncated user IDs if any exist
        // This is a common issue when migrating from Firebase or other systems
        const [users] = await connection.execute('SELECT id FROM users');
        for (const user of users) {
            const shortId = user.id.substring(0, 8);
            if (shortId.length === 8 && !user.id.startsWith('Admin-') && !user.id.startsWith('CRM-')) {
                const [res] = await connection.execute(
                    'UPDATE daily_routine_entries SET user_id = ? WHERE user_id = ?',
                    [user.id, shortId]
                );
                if (res.affectedRows > 0) {
                    console.log(`Updated ${res.affectedRows} records for user ${user.id}`);
                }
            }
        }

        console.log('--- Database Fix Completed ---');

    } catch (err) {
        console.error('Error applying database fix:', err);
    } finally {
        await connection.end();
    }
}

fixServerDatabase();
