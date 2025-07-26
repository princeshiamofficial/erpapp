
// /src/app/api/webhooks/packzy/route.ts

import { NextResponse } from 'next/server';
import { getOrderByTrackingCode, autoSettleOrderIfDelivered } from '@/lib/order-service';
import { getUsers } from '@/lib/user-service';

// This is a simplified secret key for webhook verification.
// In a production environment, you should use a more secure method like HMAC signature verification.
const PACKZY_WEBHOOK_SECRET = 'your-super-secret-webhook-key-for-packzy';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${PACKZY_WEBHOOK_SECRET}`) {
      console.warn('[Packzy Webhook] Unauthorized access attempt.');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('[Packzy Webhook] Received payload:', payload);

    const { tracking_code, delivery_status, consignment_id } = payload;

    if (!tracking_code || !delivery_status) {
      return NextResponse.json({ success: false, error: 'Missing tracking_code or delivery_status in payload' }, { status: 400 });
    }

    const order = await getOrderByTrackingCode(tracking_code);

    if (!order) {
      console.log(`[Packzy Webhook] Order with tracking code ${tracking_code} not found.`);
      // Return a 200 OK even if order not found, so Packzy doesn't keep retrying.
      return NextResponse.json({ success: true, message: 'Webhook acknowledged, order not found.' });
    }

    if (delivery_status.toLowerCase() === 'delivered') {
      // Find a system admin to attribute the change to
      const allUsers = await getUsers();
      const systemAdmin = allUsers.find(u => u.role === 'SYSTEM_ADMIN');
      if (!systemAdmin) {
        console.error(`[Packzy Webhook] CRITICAL: System Admin user not found. Cannot perform settlement for order ${order.id}.`);
        return NextResponse.json({ success: false, error: 'System configuration error: admin user not found.' }, { status: 500 });
      }

      console.log(`[Packzy Webhook] Order ${order.id} is delivered. Triggering auto-settlement.`);
      
      const settlementReason = `Order delivered. Status updated via Packzy webhook. Consignment ID: ${consignment_id || 'N/A'}.`;
      
      const success = await autoSettleOrderIfDelivered(
        order.id, 
        settlementReason, 
        { id: systemAdmin.id, name: systemAdmin.name }
      );

      if (!success) {
         console.error(`[Packzy Webhook] Auto-settlement failed for order ${order.id}.`);
         // Still return success to Packzy to avoid retries, but log the failure internally.
      }
    } else {
      console.log(`[Packzy Webhook] Received non-delivered status '${delivery_status}' for order ${order.id}. No action taken.`);
      // In the future, you could add logic here to update the order status to reflect other states like 'in_transit'.
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[Packzy Webhook] Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

// To use this webhook, provide this URL to Packzy:
// https://<your-app-domain>/api/webhooks/packzy
// And set the Authorization header to: Bearer your-super-secret-webhook-key-for-packzy
