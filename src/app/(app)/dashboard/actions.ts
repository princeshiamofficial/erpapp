
"use server";

import { revalidatePath } from 'next/cache';
import { getOrderById, updateOrdersBatch, deleteShippedOrderEntry } from '@/lib/order-service'; // Removed getOrdersByStatusAndTracking, added deleteShippedOrderEntry
import { DELIVERED_STATUS_ID, SHIPPED_STATUS_ID } from '@/lib/status-service'; 
import { getUsers } from '@/lib/user-service';
import { OrderLogEntry, TrackingLink } from '@/types'; 
import { v4 as uuidv4 } from 'uuid';
import { fetchFromApi } from '@/lib/api-helper'; // Import fetchFromApi

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

    // 1. Fetch from the new 'shippedOrders' collection for efficiency
    const shippedOrdersResponse = await fetchFromApi('collections/shippedOrders/documents?limit=500');
    const ordersToCheckCourier = shippedOrdersResponse.documents?.map((doc: any) => ({
      orderId: doc.id,
      packzyTrackingCode: doc.data.packzyTrackingCode,
    })) || [];
    
    const updatesForBatch: { id: string, data: Partial<TrackingLink> }[] = [];
    const ordersConfirmedDelivered: string[] = []; // Track IDs of orders confirmed delivered

    if (ordersToCheckCourier.length > 0) {
        console.log(`[SettleAction] Checking courier status for ${ordersToCheckCourier.length} shipped orders from the dedicated collection.`);
        const apiKey = 'vfei2q49dhy1rxqxjs6xntkkvc2odeax';
        const secretKey = 'n4wr4fhdohq0x3gmm8xg3pp1';

        for (const shippedOrder of ordersToCheckCourier) {
            try {
                const response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${shippedOrder.packzyTrackingCode}`, {
                    method: 'GET',
                    headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey, 'Content-Type': 'application/json' },
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error(`Packzy API responded with status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 200 && data.delivery_status === 'delivered') {
                    console.log(`[SettleAction] Courier confirmed delivery for order ${shippedOrder.orderId}. Queuing for update.`);
                    statusUpdateCount++;
                    
                    const fullOrder = await getOrderById(shippedOrder.orderId);
                    if (!fullOrder) {
                        console.warn(`[SettleAction] Could not fetch full order details for ID ${shippedOrder.orderId}. Skipping status update.`);
                        continue;
                    }
                    
                    const logEntry: OrderLogEntry = {
                      id: uuidv4(),
                      timestamp: new Date().toISOString(),
                      status: DELIVERED_STATUS_ID,
                      changedByUserId: actingUser.id,
                      changedByUserName: actingUser.name,
                      notes: `Auto-updated to Delivered based on courier status sync.`,
                    };

                    updatesForBatch.push({
                      id: fullOrder.id,
                      data: {
                        currentStatus: DELIVERED_STATUS_ID,
                        statusHistory: [...fullOrder.statusHistory, logEntry]
                      }
                    });
                    ordersConfirmedDelivered.push(fullOrder.id);
                }
            } catch (courierError) {
                console.error(`[SettleAction] Error fetching courier status for order ${shippedOrder.orderId}:`, courierError);
            }
        }

        // Apply batch update if any orders were confirmed delivered
        if (updatesForBatch.length > 0) {
          const batchSuccess = await updateOrdersBatch(updatesForBatch);
          if (!batchSuccess) {
            console.error("[SettleAction] Batch update for delivered statuses failed.");
            // Continue to settle dues, but log the error.
          } else {
            // 2. Remove delivered orders from 'shippedOrders' collection
            for(const orderId of ordersConfirmedDelivered) {
                await deleteShippedOrderEntry(orderId);
            }
          }
        }
    }
    
    // The rest of the logic for settling due balances is no longer needed here,
    // as it's now part of the autoSettleOrderIfDelivered flow which is called
    // when the status is updated.

    if (statusUpdateCount > 0) {
        revalidatePath("/(app)/dashboard", "layout");
        revalidatePath("/(app)/orders", "layout");
        revalidatePath("/(app)/invoice", "layout");
    }
    
    return { success: true, settledCount: 0, statusUpdateCount }; // settledCount is now implicitly handled
  } catch (error) {
    console.error("Error in settleAllDeliveredOrdersAction:", error);
    return { success: false, settledCount: 0, statusUpdateCount: 0, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
