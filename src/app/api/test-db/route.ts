import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Test basic database connectivity by fetching a list of tables or one order
    const tableTest = await query<any[]>('SHOW TABLES');
    
    // 2. Fetch the records in client_payments
    let clientPayments = [];
    let paymentsError = null;
    try {
      clientPayments = await query<any[]>('SELECT * FROM client_payments');
    } catch (err) {
      paymentsError = err instanceof Error ? err.message : String(err);
    }

    // 3. Fetch latest 5 order IDs to compare database states
    let latestOrders = [];
    let ordersError = null;
    try {
      latestOrders = await query<any[]>('SELECT id, companyName, currentStatus FROM orders ORDER BY createdAt DESC LIMIT 5');
    } catch (err) {
      ordersError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      success: true,
      database: process.env.DATABASE_NAME,
      tables: tableTest,
      clientPayments,
      paymentsError,
      latestOrders,
      ordersError
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
