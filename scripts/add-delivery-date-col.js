const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
    let envContent = '';
    try {
        envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    } catch (e) {
        console.error('Could not find .env');
        process.exit(1);
    }

    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });

    const connection = await mysql.createConnection({
        host: env.DATABASE_HOST || 'localhost',
        user: env.DATABASE_USER || 'root',
        password: env.DATABASE_PASSWORD || '',
        database: env.DATABASE_NAME || 'erp_database',
        port: parseInt(env.DATABASE_PORT || '3306', 10),
    });

    try {
        console.log('Adding accepted_delivery_date column to orders table...');
        // First check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM orders LIKE "accepted_delivery_date"');
        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE orders 
                ADD COLUMN accepted_delivery_date DATETIME NULL DEFAULT NULL;
            `);
            console.log('Migration successful.');
        } else {
            console.log('Column "accepted_delivery_date" already exists.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
