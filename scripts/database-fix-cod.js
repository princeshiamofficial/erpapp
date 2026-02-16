const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables from .env
dotenv.config();

async function fixDatabaseCodAmounts() {
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

    console.log('🚀 Starting Database COD Fix Script...');

    try {
        // 1. Fetch all orders that have advance payments
        const [orders] = await pool.execute('SELECT id, company_name, order_items, special_client_discount, shipping_charge, advance_payments FROM orders');

        let fixedCount = 0;

        for (const order of orders) {
            const advancePayments = typeof order.advance_payments === 'string' ? JSON.parse(order.advance_payments) : (order.advance_payments || []);
            const orderItems = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : (order.order_items || []);

            if (!Array.isArray(advancePayments) || advancePayments.length === 0) continue;

            // Calculate correct values
            const orderSubtotal = orderItems.reduce((acc, item) => acc + (Number(item.lineItemTotalPrice) || 0), 0);
            const effectiveDiscount = Number(order.special_client_discount) || 0;
            const netPayable = orderSubtotal - effectiveDiscount;
            const shippingCharge = Number(order.shipping_charge) || 0;

            // We need to find the "bad" payment without including it in the sum first
            let badPaymentIndex = advancePayments.findIndex(p =>
                (p.paymentMethod === 'COD' || (p.notes && p.notes.includes('auto-settled'))) &&
                Number(p.amount) > (orderSubtotal + shippingCharge) // Sanity check: amount is way too high
            );

            if (badPaymentIndex !== -1) {
                const badPayment = advancePayments[badPaymentIndex];

                // Calculate what the sum was BEFORE the bad payment was added
                const otherPayments = advancePayments.filter((_, idx) => idx !== badPaymentIndex);
                const totalOtherPayments = otherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                const correctDueAmount = netPayable + shippingCharge - totalOtherPayments;

                // Double check if the current bad amount looks like a concatenation error
                // Concatenation would be: (netPayable.toString() + shippingCharge.toString()) - totalOtherPayments
                const concatAmount = Number(netPayable.toString() + shippingCharge.toString()) - totalOtherPayments;

                if (Math.abs(Number(badPayment.amount) - concatAmount) < 1) {
                    console.log(`\nFound affected order: ${order.id} (${order.company_name})`);
                    console.log(`- Incorrect COD Amount: ${badPayment.amount}`);
                    console.log(`- Corrected COD Amount: ${correctDueAmount}`);

                    // Update the payment record
                    advancePayments[badPaymentIndex].amount = correctDueAmount;
                    advancePayments[badPaymentIndex].notes = (badPayment.notes || '') + " [RECALCULATED BY FIX SCRIPT]";

                    // Save back to DB
                    await pool.execute('UPDATE orders SET advance_payments = ?, updated_at = NOW() WHERE id = ?', [
                        JSON.stringify(advancePayments),
                        order.id
                    ]);

                    fixedCount++;
                }
            }
        }

        console.log(`\n✅ Script finished. Total orders fixed: ${fixedCount}`);

    } catch (error) {
        console.error('❌ Error executing script:', error);
    } finally {
        await pool.end();
    }
}

fixDatabaseCodAmounts();
