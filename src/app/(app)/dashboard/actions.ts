
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

export async function settleAllDeliveredOrdersAction(): Promise<{ success: boolean; settledCount: number; error?: string }> {
  try {
    const allOrders = await getOrders();
    const allUsers = await getUsers();
    
    const systemAdmin = allUsers.find(u => u.role === 'SYSTEM_ADMIN');
    if (!systemAdmin) {
      return { success: false, settledCount: 0, error: "System Admin user not found to perform settlement." };
    }
    const actingUser = { id: systemAdmin.id, name: systemAdmin.name };
    
    const deliveredOrdersWithDue = allOrders.filter(order => {
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

    if (deliveredOrdersWithDue.length === 0) {
      return { success: true, settledCount: 0 };
    }

    let settledCount = 0;
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
    
    revalidatePath("/(app)/dashboard", "layout");
    revalidatePath("/(app)/orders", "layout");
    revalidatePath("/(app)/invoice", "layout");
    
    return { success: true, settledCount };
  } catch (error) {
    console.error("Error in settleAllDeliveredOrdersAction:", error);
    return { success: false, settledCount: 0, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
