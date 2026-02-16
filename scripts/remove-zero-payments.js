const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

async function removeZeroPayments() {
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

    console.log('🚀 Starting Zero-Payment Removal Script...');

    try {
        // Fetch orders that have advance payments
        const [orders] = await pool.execute('SELECT id, company_name, advance_payments FROM orders');

        let removedCount = 0;
        let ordersAffected = 0;

        for (const order of orders) {
            const advancePayments = typeof order.advance_payments === 'string' ? JSON.parse(order.advance_payments) : (order.advance_payments || []);

            if (!Array.isArray(advancePayments) || advancePayments.length === 0) continue;

            // Filter out payments where amount is 0
            const initialLength = advancePayments.length;
            const filteredPayments = advancePayments.filter(p => Number(p.amount) > 0.01);

            if (filteredPayments.length < initialLength) {
                const diff = initialLength - filteredPayments.length;
                console.log(`\nCleaning order: ${order.id} (${order.company_name})`);
                console.log(`- Removing ${diff} zero-amount payment record(s).`);

                // Save back to DB
                await pool.execute('UPDATE orders SET advance_payments = ?, updated_at = NOW() WHERE id = ?', [
                    JSON.stringify(filteredPayments),
                    order.id
                ]);

                removedCount += diff;
                ordersAffected++;
            }
        }

        console.log(`\n✅ Script finished.`);
        console.log(`- Total orders affected: ${ordersAffected}`);
        console.log(`- Total zero-payments removed: ${removedCount}`);

    } catch (error) {
        console.error('❌ Error executing script:', error);
    } finally {
        await pool.end();
    }
}

removeZeroPayments();
