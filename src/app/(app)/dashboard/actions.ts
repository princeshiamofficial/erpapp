
"use server";

import { updateGlobalSalesTarget as updateTargetInDb } from '@/lib/settings-service';
import { revalidatePath } from 'next/cache';
import { getOrders, autoSettleOrderIfDelivered, getOrdersByStatusAndTracking, updateOrdersBatch } from '@/lib/order-service'; // Added getOrdersByStatusAndTracking and updateOrdersBatch
import { DELIVERED_STATUS_ID, SHIPPED_STATUS_ID } from '@/lib/status-service'; // Added SHIPPED_STATUS_ID
import { getUsers } from '@/lib/user-service';
import { OrderLogEntry, TrackingLink } from '@/types'; // Added TrackingLink and OrderLogEntry
import { v4 as uuidv4 } from 'uuid';

export async function setGlobalTargetAction(targetType: 'monthly' | 'weekly', newTarget: number): Promise<{ success: boolean; error?: string }> {
  if (newTarget < 0 || isNaN(newTarget)) {
    return { success: false, error: "Target must be a non-negative number." };
  }

  try {
    const success = await updateTargetInDb(targetType, newTarget);
    if (success) {
      revalidatePath('/(app)/dashboard'); 
      return { success: true };
    }
    return { success: false, error: "Failed to update target in database." };
  } catch (error) {
    console.error("Error in setGlobalTargetAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function settleAllDeliveredOrdersAction(): Promise<{ success: boolean; settledCount: number; statusUpdateCount: number; error?: string }> {
  try {
    const allUsers = await getUsers();
    const systemAdmin = allUsers.find(u => u.role === 'SYSTEM_ADMIN');

    if (!systemAdmin) {
      return { success: false, settledCount: 0, statusUpdateCount: 0, error: "System Admin user not found to perform settlement." };
    }
    const actingUser = { id: systemAdmin.id, name: systemAdmin.name };
    
    let settledCount = 0;
    let statusUpdateCount = 0;

    // Fetch only orders that are 'Shipped' and have a tracking code
    const ordersToCheckCourier = await getOrdersByStatusAndTracking(SHIPPED_STATUS_ID);
    const updatesForBatch: { id: string, data: Partial<TrackingLink> }[] = [];

    if (ordersToCheckCourier.length > 0) {
        console.log(`[SettleAction] Checking courier status for ${ordersToCheckCourier.length} shipped orders with tracking codes.`);
        const apiKey = 'vfei2q49dhy1rxqxjs6xntkkvc2odeax';
        const secretKey = 'n4wr4fhdohq0x3gmm8xg3pp1';

        for (const order of ordersToCheckCourier) {
            try {
                const response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${order.packzyTrackingCode}`, {
                    method: 'GET',
                    headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey, 'Content-Type': 'application/json' },
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error(`Packzy API responded with status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 200 && data.delivery_status === 'delivered') {
                    console.log(`[SettleAction] Courier confirmed delivery for order ${order.id}. Queuing for update.`);
                    statusUpdateCount++;
                    
                    const logEntry: OrderLogEntry = {
                      id: uuidv4(),
                      timestamp: new Date().toISOString(),
                      status: DELIVERED_STATUS_ID,
                      changedByUserId: actingUser.id,
                      changedByUserName: actingUser.name,
                      notes: `Auto-updated to Delivered based on courier status sync.`,
                    };

                    updatesForBatch.push({
                      id: order.id,
                      data: {
                        currentStatus: DELIVERED_STATUS_ID,
                        statusHistory: [...order.statusHistory, logEntry]
                      }
                    });
                }
            } catch (courierError) {
                console.error(`[SettleAction] Error fetching courier status for order ${order.id}:`, courierError);
            }
        }

        // Apply batch update if any orders were confirmed delivered
        if (updatesForBatch.length > 0) {
          const batchSuccess = await updateOrdersBatch(updatesForBatch);
          if (!batchSuccess) {
            console.error("[SettleAction] Batch update for delivered statuses failed.");
            // Continue to settle dues, but log the error.
          }
        }
    }

    // Now, fetch all delivered orders (including newly updated ones) with a due balance
    const deliveredOrdersWithDue = await getOrdersByStatusAndTracking(DELIVERED_STATUS_ID, true);

    if (deliveredOrdersWithDue.length > 0) {
        console.log(`[SettleAction] Found ${deliveredOrdersWithDue.length} delivered orders with a due balance. Settling...`);
        for (const order of deliveredOrdersWithDue) {
          const result = await autoSettleOrderIfDelivered(
            order.id, 
            "Manual sync: System auto-settled delivered order with due balance.", 
            actingUser
          );
          if (result) {
            settledCount++;
          }
        }
    }
    
    // Only revalidate if changes were made
    if (statusUpdateCount > 0 || settledCount > 0) {
        revalidatePath("/(app)/dashboard", "layout");
        revalidatePath("/(app)/orders", "layout");
        revalidatePath("/(app)/invoice", "layout");
    }
    
    return { success: true, settledCount, statusUpdateCount };
  } catch (error) {
    console.error("Error in settleAllDeliveredOrdersAction:", error);
    return { success: false, settledCount: 0, statusUpdateCount: 0, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
