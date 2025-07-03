
"use server";

import { updateGlobalSalesTarget as updateTargetInDb } from '@/lib/settings-service';
import { revalidatePath } from 'next/cache';
import { getOrders, autoSettleOrderIfDelivered } from '@/lib/order-service';
import { DELIVERED_STATUS_ID } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';

export async function setGlobalTargetAction(targetType: 'monthly' | 'weekly', newTarget: number): Promise<{ success: boolean; error?: string }> {
  if (newTarget < 0 || isNaN(newTarget)) {
    return { success: false, error: "Target must be a non-negative number." };
  }

  try {
    const success = await updateTargetInDb(targetType, newTarget);
    if (success) {
      revalidatePath('/(app)/dashboard'); // Revalidate to reflect changes
      return { success: true };
    }
    // Explicitly return error object if success is false
    return { success: false, error: "Failed to update target in database." };
  } catch (error) {
    console.error("Error in setGlobalTargetAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function settleAllDeliveredOrdersAction(): Promise<{ success: boolean; settledCount: number; statusUpdateCount: number; error?: string }> {
  try {
    let allOrders = await getOrders();
    const allUsers = await getUsers();
    
    const systemAdmin = allUsers.find(u => u.role === 'SYSTEM_ADMIN');
    if (!systemAdmin) {
      return { success: false, settledCount: 0, statusUpdateCount: 0, error: "System Admin user not found to perform settlement." };
    }
    const actingUser = { id: systemAdmin.id, name: systemAdmin.name };
    
    let settledCount = 0;
    let statusUpdateCount = 0;

    // Part 1: Proactively check courier statuses for non-delivered orders
    const ordersToCheckCourier = allOrders.filter(order => 
        order.currentStatus !== DELIVERED_STATUS_ID && order.packzyTrackingCode
    );

    if (ordersToCheckCourier.length > 0) {
        console.log(`[SettleAction] Checking courier status for ${ordersToCheckCourier.length} non-delivered orders with tracking codes.`);
        const apiKey = 'vfei2q49dhy1rxqxjs6xntkkvc2odeax';
        const secretKey = 'n4wr4fhdohq0x3gmm8xg3pp1';

        for (const order of ordersToCheckCourier) {
            try {
                const response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${order.packzyTrackingCode}`, {
                    method: 'GET',
                    headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey, 'Content-Type': 'application/json' },
                    cache: 'no-store',
                });
                const data = await response.json();

                if (data.status === 200 && data.delivery_status === 'delivered') {
                    console.log(`[SettleAction] Courier confirmed delivery for order ${order.id}. Auto-settling...`);
                    const result = await autoSettleOrderIfDelivered(
                        order.id, 
                        "Manual sync: Courier confirmed delivery.", 
                        actingUser
                    );
                    if (result) {
                        statusUpdateCount++;
                    }
                }
            } catch (courierError) {
                console.error(`[SettleAction] Error fetching courier status for order ${order.id}:`, courierError);
                // Continue to next order
            }
        }
    }

    // Part 2: Retroactively fix due amounts on already-delivered orders
    // Re-fetch orders to get the updated list after Part 1's potential updates
    const updatedAllOrders = await getOrders();
    const deliveredOrdersWithDue = updatedAllOrders.filter(order => {
      if (order.currentStatus !== DELIVERED_STATUS_ID) {
        return false;
      }
      const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
      const effectiveDiscount = order.specialClientDiscount || 0;
      const netPayable = orderSubtotal - effectiveDiscount;
      const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
      const dueAmount = netPayable - totalAdvancePaid;
      return dueAmount > 0.01;
    });

    if (deliveredOrdersWithDue.length > 0) {
        console.log(`[SettleAction] Found ${deliveredOrdersWithDue.length} internally delivered orders with a due balance. Settling...`);
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
    
    revalidatePath("/(app)/dashboard", "layout");
    revalidatePath("/(app)/orders", "layout");
    revalidatePath("/(app)/invoice", "layout");
    
    return { success: true, settledCount, statusUpdateCount };
  } catch (error) {
    console.error("Error in settleAllDeliveredOrdersAction:", error);
    return { success: false, settledCount: 0, statusUpdateCount: 0, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
