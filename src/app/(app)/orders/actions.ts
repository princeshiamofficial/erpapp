

"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderItem, AdvancePaymentRecord, ServiceModelItem, OrderLogEntry } from "@/types";
import { addOrder as addOrderService, getOrderById, deleteOrder as deleteOrderFromDb, updateOrder as updateOrderService } from "@/lib/order-service"; 
import { getGlobalSettings } from "@/lib/settings-service";
import { v4 as uuidv4 } from 'uuid';
import { parseISO } from 'date-fns';
import { getUserById as getUserFromDb } from "@/lib/user-service";
import { getModels, updateModelStock } from '@/lib/service-options-service';
import { fetchFromApiV3 } from '@/lib/api-helper2';
import { adminApp } from '@/lib/firebase-admin'; // Import adminApp
import type { messaging } from 'firebase-admin'; // Import messaging type

interface CreateOrderDialogFormData {
  jobId: string;
  companyName: string;
  address: string;
  phoneNumber: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    model: string;
    quantity: number; // Changed from string to number
    lamination: string;
    unitPrice: number | null;
    lineItemTotalPrice: number | null;
  }>;
  advancePaymentAmount?: string | null;
  advancePaymentMethod?: string | null;
  advancePaymentDocumentUrl?: string | null;
  newAdvancePaymentNotes?: string | null;
  specialClientDiscount?: number | null;
  customPaymentMethodText?: string; 
  orderNotes?: string | null;
  initialStatusId: string;
}

export async function createOrderAction(
  data: CreateOrderDialogFormData,
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  try {
    if (!currentUser || !currentUser.id || !currentUser.name) {
      return { error: "User information is missing. Please re-authenticate." };
    }
    if (!data.jobId?.trim()) return { error: "Job ID is required." };
    if (!data.companyName?.trim()) return { error: "Company Name is required." };
    if (!data.address?.trim()) return { error: "Address is required." };
    
    const phoneNumber = data.phoneNumber?.trim();
    if (!phoneNumber) return { error: "Phone Number is required." };
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return { error: "Invalid phone number. It must be an 11-digit number starting with 0." };
    }

    if (!data.initialStatusId) return { error: "Initial status ID is required." };
    if (!data.createdAt) return { error: "Order creation date is required." };
    try {
      parseISO(data.createdAt);
    } catch (e) {
      return { error: "Invalid order creation date format." };
    }
    if (!data.orderItems || data.orderItems.length === 0) {
      return { error: "At least one order item is required." };
    }

    const allModels = await getModels();
    let orderItemsTotal = 0;
    const processedOrderItems: OrderItem[] = [];
    for (const item of data.orderItems) {
      if (!item.model?.trim()) return { error: `Model is required for all order items.` };
      const quantity = item.quantity; // Already a number
      if (isNaN(quantity) || quantity < 0) return { error: `Invalid quantity for model "${item.model}". Quantity must be a non-negative number.` };
      
      const lamination = item.lamination?.trim() || 'N/A'; // Default lamination if empty
      
      const unitPrice = item.unitPrice === undefined || item.unitPrice === null || isNaN(Number(item.unitPrice)) ? 0 : Number(item.unitPrice);
      const lineItemTotalPrice = item.lineItemTotalPrice === undefined || item.lineItemTotalPrice === null || isNaN(Number(item.lineItemTotalPrice)) ? 0 : Number(item.lineItemTotalPrice);
      

      processedOrderItems.push({
        id: item.id || uuidv4(),
        model: item.model.trim(),
        quantity: quantity,
        lamination: lamination,
        unitPrice: unitPrice,
        lineItemTotalPrice: lineItemTotalPrice,
      });
      orderItemsTotal += lineItemTotalPrice;
    }

    if (data.specialClientDiscount !== null && data.specialClientDiscount !== undefined && data.specialClientDiscount < 0) {
      return { error: "Special Client Discount must be a non-negative number." };
    }
    if (data.specialClientDiscount !== null && data.specialClientDiscount !== undefined && data.specialClientDiscount > orderItemsTotal && orderItemsTotal > 0) {
      return { error: "Special Client Discount cannot exceed the total order price." };
    }

    let parsedAdvancePaymentAmount: number | null = null;
    const advancePaymentAmountStr = String(data.advancePaymentAmount ?? '');
    if (advancePaymentAmountStr.trim() !== '') {
      const numAdvancePayment = Number(advancePaymentAmountStr);
      if (isNaN(numAdvancePayment) || numAdvancePayment < 0) return { error: "Advance Payment Amount must be a non-negative number." };
      parsedAdvancePaymentAmount = numAdvancePayment;
    }
    
    if (parsedAdvancePaymentAmount && parsedAdvancePaymentAmount > 0 && !data.advancePaymentDocumentUrl) {
      return { error: "Payment proof is required for advance payments." };
    }

    const netPayable = orderItemsTotal - (data.specialClientDiscount || 0);
    const grandTotal = netPayable; 
    if (parsedAdvancePaymentAmount !== null && parsedAdvancePaymentAmount > grandTotal && grandTotal > 0) {
        return { error: `Advance payment (${parsedAdvancePaymentAmount}) cannot exceed grand total amount (${grandTotal}).` };
    }

    let finalAdvancePaymentMethod: string | null = null;
    if (parsedAdvancePaymentAmount !== null && parsedAdvancePaymentAmount > 0) {
        if (data.advancePaymentMethod && typeof data.advancePaymentMethod === 'string' && data.advancePaymentMethod.trim() !== '') {
          if (data.advancePaymentMethod.toLowerCase() === 'other') {
            if (!data.customPaymentMethodText || !data.customPaymentMethodText.trim()) return { error: "Please specify the 'Other' payment method for the advance." };
            finalAdvancePaymentMethod = data.customPaymentMethodText.trim();
          } else {
            finalAdvancePaymentMethod = data.advancePaymentMethod.trim();
          }
        } else {
            return { error: "Payment Method is required when Advance Payment is entered." };
        }
    }

    const finalCombinedCompanyName = `${data.jobId.trim()} • ${data.companyName.trim()}`;

    const newOrderDataForService = {
      companyName: finalCombinedCompanyName,
      address: data.address.trim(),
      phoneNumber: phoneNumber,
      createdAt: data.createdAt,
      orderItems: processedOrderItems,
      advancePaymentAmount: parsedAdvancePaymentAmount, 
      advancePaymentMethod: finalAdvancePaymentMethod,
      advancePaymentDocumentUrl: data.advancePaymentDocumentUrl || null,
      specialClientDiscount: data.specialClientDiscount,
      shippingCharge: null,
      orderNotes: data.orderNotes?.trim() || null,
      initialStatusId: data.initialStatusId,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      newAdvancePaymentNotes: data.newAdvancePaymentNotes || null,
    };

    const createdOrder = await addOrderService(newOrderDataForService);
    if (!createdOrder) return { error: "Failed to create order due to a service error." };

    for (const item of processedOrderItems) {
      const modelInfo = allModels.find(m => m.name === item.model);
      if (modelInfo && modelInfo.isReadyMade) {
        // Decrease stock by the quantity of the item
        await updateModelStock(modelInfo.id, -item.quantity);
      }
    }


    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/admin/model-management");
    revalidatePath("/(app)/crm/sow"); // Revalidate SOW page
    return createdOrder;

  } catch (error: any) {
    console.error("Unexpected error in createOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred. Please try again later.";
    return { error: errorMessage };
  }
}

export async function updateOrderAction(
  orderId: string,
  updates: Partial<TrackingLink> & {
    specialClientDiscountString?: string | null;
    newAdvancePaymentAmount?: number | null;
    newAdvancePaymentMethod?: string | null;
    newAdvancePaymentNotes?: string | null;
    newAdvancePaymentDocumentUrl?: string | null;
  },
  currentUser: User
): Promise<{ success: boolean; error?: string; order?: TrackingLink }> {
  if (!currentUser || !currentUser.role) {
    return { success: false, error: "User authentication error. Please log in again." };
  }

  try {
    if (!orderId) return { success: false, error: "Order ID is required." };

    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) return { success: false, error: `Order with ID ${orderId} not found.` };
    
    const allModels = await getModels();

    const finalUpdates: Partial<TrackingLink> & { newAdvancePaymentDocumentUrl?: string | null; } = { ...updates };
    delete finalUpdates.newAdvancePaymentAmount;
    delete finalUpdates.newAdvancePaymentMethod;
    delete finalUpdates.newAdvancePaymentNotes;
    delete finalUpdates.newAdvancePaymentDocumentUrl;
    delete finalUpdates.specialClientDiscountString;

    let currentOrderItemsTotal = (updates.orderItems || existingOrder.orderItems).reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);

    if (updates.createdAt) {
      try {
        finalUpdates.createdAt = parseISO(updates.createdAt).toISOString();
      } catch (e) {
        return { success: false, error: "Invalid Date Created format." };
      }
    }
    
    if (updates.shippingCharge !== undefined) {
      const charge = Number(updates.shippingCharge);
      if (isNaN(charge) || charge < 0) {
        return { success: false, error: "Shipping charge must be a non-negative number." };
      }
      finalUpdates.shippingCharge = charge > 0 ? charge : null;
    }

    if (updates.specialClientDiscountString !== undefined) {
        if (updates.specialClientDiscountString && updates.specialClientDiscountString.trim() !== '') {
            const discountStr = updates.specialClientDiscountString.trim();
            let numericDiscount = 0;
            if (discountStr.endsWith('%')) {
                const percentage = parseFloat(discountStr.substring(0, discountStr.length - 1));
                if (isNaN(percentage) || percentage < 0) return { success: false, error: "Invalid percentage for Special Client Discount."};
                numericDiscount = (percentage / 100) * currentOrderItemsTotal;
            } else {
                const fixedAmount = parseFloat(discountStr);
                if (isNaN(fixedAmount) || fixedAmount < 0) return { success: false, error: "Special Client Discount must be a non-negative number."};
                numericDiscount = fixedAmount;
            }
            if (numericDiscount > currentOrderItemsTotal && currentOrderItemsTotal > 0) return { success: false, error: "Special Client Discount cannot exceed the total order price."};
            finalUpdates.specialClientDiscount = numericDiscount;
        } else {
            finalUpdates.specialClientDiscount = null;
        }
    }

    if (updates.companyName !== undefined && !updates.companyName.trim()) return { success: false, error: "Company Name (Job ID • Name) cannot be empty."};
    if (updates.address !== undefined && !updates.address.trim()) return { success: false, error: "Address cannot be empty."};
    
    if (updates.phoneNumber !== undefined) {
      const phoneNumber = updates.phoneNumber.trim();
      if (!phoneNumber) return { success: false, error: "Phone Number cannot be empty." };
      const phoneRegex = /^0\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return { success: false, error: "Invalid phone number. It must be an 11-digit number starting with 0." };
      }
      finalUpdates.phoneNumber = phoneNumber;
    }
    
    if (updates.orderNotes !== undefined) finalUpdates.orderNotes = updates.orderNotes?.trim() || null;
    
    if (updates.orderItems) {
      if (!Array.isArray(updates.orderItems) || updates.orderItems.length === 0) return { success: false, error: "Order must have at least one item." };
      
      const stockChanges = new Map<string, number>(); 
      const oldItemsMap = new Map(existingOrder.orderItems.map(item => [item.id, item]));

      for (const newItem of updates.orderItems) {
        const oldItem = oldItemsMap.get(newItem.id);
        const oldModel = oldItem ? allModels.find(m => m.name === oldItem.model) : undefined;
        const newModel = allModels.find(m => m.name === newItem.model);

        if (oldItem && oldItem.model !== newItem.model) {
          if (oldModel && oldModel.isReadyMade) {
            stockChanges.set(oldModel.id, (stockChanges.get(oldModel.id) || 0) + oldItem.quantity); // Re-add stock for old model
          }
          if (newModel && newModel.isReadyMade) {
            stockChanges.set(newModel.id, (stockChanges.get(newModel.id) || 0) - newItem.quantity); // Decrease stock for new model
          }
        } else if (newModel && newModel.isReadyMade) {
          const quantityChange = newItem.quantity - (oldItem ? oldItem.quantity : 0);
          if (quantityChange !== 0) {
            stockChanges.set(newModel.id, (stockChanges.get(newModel.id) || 0) - quantityChange); // Adjust stock for quantity change
          }
        }
        if (oldItem) {
          oldItemsMap.delete(newItem.id); 
        } else { // It's a completely new item in the order
           if (newModel && newModel.isReadyMade) {
             stockChanges.set(newModel.id, (stockChanges.get(newModel.id) || 0) - newItem.quantity);
           }
        }
      }
      
      // Items that were removed from the order
      for (const removedItem of oldItemsMap.values()) {
        const modelInfo = allModels.find(m => m.name === removedItem.model);
        if (modelInfo && modelInfo.isReadyMade) {
          stockChanges.set(modelInfo.id, (stockChanges.get(modelInfo.id) || 0) + removedItem.quantity); // Re-add stock
        }
      }

      for (const [modelId, quantityChange] of stockChanges.entries()) {
         if (quantityChange !== 0) {
            await updateModelStock(modelId, quantityChange); 
         }
      }
      finalUpdates.orderItems = updates.orderItems;
    }


    if (updates.newAdvancePaymentAmount && updates.newAdvancePaymentAmount > 0) {
        if (!updates.newAdvancePaymentMethod || !updates.newAdvancePaymentMethod.trim()) {
            return { success: false, error: "Payment method is required for new advance payment." };
        }
        if (!updates.newAdvancePaymentDocumentUrl) {
            return { success: false, error: "Payment proof is required for new advance payments." };
        }

        const newAdvanceRecord: AdvancePaymentRecord = {
            id: uuidv4(),
            amount: updates.newAdvancePaymentAmount,
            date: new Date().toISOString(),
            paymentMethod: updates.newAdvancePaymentMethod,
            notes: updates.newAdvancePaymentNotes?.trim() || null,
            recordedByUserId: currentUser.id,
            recordedByUserName: currentUser.name,
            documentUrl: updates.newAdvancePaymentDocumentUrl,
        };
        finalUpdates.advancePayments = [...(existingOrder.advancePayments || []), newAdvanceRecord];

        const totalAdvanceAfterNew = (finalUpdates.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
        const currentNetPayable = currentOrderItemsTotal - (finalUpdates.specialClientDiscount ?? existingOrder.specialClientDiscount ?? 0);
        const currentShippingCharge = finalUpdates.shippingCharge ?? existingOrder.shippingCharge ?? 0;
        const currentGrandTotal = currentNetPayable + currentShippingCharge;

        if (totalAdvanceAfterNew > currentGrandTotal && currentGrandTotal > 0) {
           return { success: false, error: `Total advance payment (${totalAdvanceAfterNew}) cannot exceed grand total amount (${currentGrandTotal}).` };
        }
    } else if (updates.advancePayments) {
        finalUpdates.advancePayments = updates.advancePayments;
    }

    if (Object.keys(finalUpdates).length === 0 && updates.specialClientDiscountString === undefined) {
        return { success: true, order: existingOrder, error: "No changes detected to save." };
    }

    finalUpdates.updatedAt = new Date().toISOString();
    finalUpdates.updatedByUserId = currentUser.id;
    finalUpdates.updatedByUserName = currentUser.name;

    const success = await updateOrderService(orderId, finalUpdates);
    if (!success) return { success: false, error: "Failed to update order in database." };

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) return { success: false, error: "Failed to retrieve updated order after update." };
    
    try {
        const project = await fetchFromApiV3(`collections/projects/documents/${orderId}`);
        if (project && project.data) {
            console.log(`[updateOrderAction] Found persistent project for order ${orderId}. Syncing info.`);
            const projectUpdates: { [key: string]: any } = {};
            if (finalUpdates.companyName) projectUpdates.name = finalUpdates.companyName;
            if (finalUpdates.crmUserName) projectUpdates.assigneeName = finalUpdates.crmUserName;
            if (finalUpdates.designerRepresentativeName !== undefined) {
                projectUpdates.designerRepresentativeName = finalUpdates.designerRepresentativeName;
                projectUpdates.designerRepresentativeAvatarUrl = null;
            }
            
            if(Object.keys(projectUpdates).length > 0) {
                 const payload = { data: { ...project.data, ...projectUpdates }};
                 await fetchFromApiV3(`collections/projects/documents/${orderId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                 });
                 console.log(`[updateOrderAction] Synced project ${orderId} with updates:`, projectUpdates);
            }
        }
    } catch (projectError) {
        if (!(projectError instanceof Error && projectError.message.includes('not found'))) {
          console.warn(`[updateOrderAction] Failed to sync order update to project board for order ${orderId}. This is not a critical error. Error:`, projectError);
        }
    }

    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");
    revalidatePath("/(app)/projects");
    revalidatePath("/(app)/admin/model-management");
    revalidatePath("/(app)/crm/sow"); // Revalidate SOW page

    return { success: true, order: updatedOrder };
  } catch (error: any) {
    console.error("Unexpected error in updateOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred while updating order.";
    return { success: false, error: errorMessage };
  }
}

export async function assignDrToOrderAction(
  orderId: string,
  designerRepresentativeId: string,
  designerRepresentativeName: string,
  actingUser: User,
  readyForDesignStatusId: string
): Promise<TrackingLink | { error: string }> {
  try {
    if (!actingUser || !actingUser.id || !actingUser.name) {
      return { error: "Acting user information is missing." };
    }
     if (readyForDesignStatusId !== 'ready-for-design') {
      return { error: "Invalid target status ID for DR assignment. Configuration error." };
    }

    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      return { error: `Order ${orderId} not found.` };
    }
    
    const designerRepUser = await getUserFromDb(designerRepresentativeId);
    if (!designerRepUser) {
        return { error: `Designer Representative with ID ${designerRepresentativeId} not found.` };
    }
    const freshDrName = designerRepUser.name;

    const logEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: readyForDesignStatusId,
      changedByUserId: actingUser.id,
      changedByUserName: actingUser.name,
      notes: `Assigned to Designer: ${freshDrName} by ${actingUser.name}.`,
    };

    const updatedOrderData: Partial<TrackingLink> = {
      designerRepresentativeId,
      designerRepresentativeName: freshDrName,
      currentStatus: readyForDesignStatusId,
      statusHistory: Array.isArray(currentOrder.statusHistory)
        ? [...currentOrder.statusHistory, logEntry]
        : [logEntry],
      updatedAt: new Date().toISOString(),
      updatedByUserId: actingUser.id,
      updatedByUserName: actingUser.name,
    };

    const success = await updateOrderService(orderId, updatedOrderData);
    if (!success) {
      return { error: "Failed to update order with DR assignment." };
    }
    
    try {
      const project = await fetchFromApiV3(`collections/projects/documents/${orderId}`);
      if (project && project.data) {
        const projectUpdates = {
          designerRepresentativeId: designerRepresentativeId,
          designerRepresentativeName: freshDrName,
          designerRepresentativeAvatarUrl: null,
          status: 'On Design',
          onDesignAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const payload = { data: { ...project.data, ...projectUpdates }};
        await fetchFromApiV3(`collections/projects/documents/${orderId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }
    } catch (projectError) {
        if (!(projectError instanceof Error && projectError.message.toLowerCase().includes('not found'))) {
          console.warn(`[assignDrToOrderAction] Failed to sync DR assignment to project board for order ${orderId}. This is not a critical error if project was not yet persistent. Error:`, projectError);
        }
    }

    // Send push notification
    if (designerRepUser && designerRepUser.fcmToken) {
      console.log(`[assignDrToOrderAction] DR ${designerRepUser.name} has FCM token. Attempting to send push notification.`);
      try {
        const globalSettings = await getGlobalSettings();
        const rawTitle = globalSettings.drAssignmentNotificationTitle || 'New Task Assigned: %company%';
        const rawBody = globalSettings.drAssignmentNotificationBody || 'You have been assigned to order %orderId% (Job ID: %jobid%).';
        
        const companyNameParts = currentOrder.companyName.split(' • ');
        const jobId = companyNameParts.length > 1 ? companyNameParts[0].trim() : currentOrder.id;
        const companyName = companyNameParts.length > 1 ? companyNameParts.slice(1).join(' • ').trim() : currentOrder.companyName;
        
        const personalizedTitle = rawTitle.replace(/%assignerName%/g, actingUser.name)
                                        .replace(/%orderId%/g, currentOrder.id)
                                        .replace(/%company%/g, companyName)
                                        .replace(/%jobid%/g, jobId);

        const personalizedBody = rawBody.replace(/%assignerName%/g, actingUser.name)
                                      .replace(/%orderId%/g, currentOrder.id)
                                      .replace(/%company%/g, companyName)
                                      .replace(/%jobid%/g, jobId);

        const customSoundUrl = globalSettings.toastSoundUrl;
        const targetUrl = `/track/${orderId}`; 
        
        const fcmMessage: messaging.Message = {
          token: designerRepUser.fcmToken,
          notification: { title: personalizedTitle, body: personalizedBody, imageUrl: designerRepUser.avatarUrl || '/icons/icon-192x192.png' },
          data: { 
            title: personalizedTitle, body: personalizedBody, iconUrl: designerRepUser.avatarUrl || '/icons/icon-192x192.png',
            targetUrl: targetUrl, click_action: targetUrl,
            ...(customSoundUrl && { customSoundUrl: customSoundUrl }) 
          },
          webpush: { 
            notification: { 
                icon: designerRepUser.avatarUrl || '/icons/icon-192x192.png', 
                badge: '/icons/icon-72x72.png',
                ...(customSoundUrl ? { sound: customSoundUrl } : { sound: "default" }) 
            }, 
            fcmOptions: { link: targetUrl }
          },
        };
        
        if (adminApp && typeof adminApp.messaging === 'function') {
            await adminApp.messaging().send(fcmMessage);
            console.log(`[assignDrToOrderAction] Push notification sent to DR ${designerRepUser.name}.`);
        } else {
            console.warn("[assignDrToOrderAction] Firebase Admin SDK not properly initialized. Cannot send push notification.");
        }
      } catch (notifError) {
        console.error(`[assignDrToOrderAction] Failed to send push notification to DR ${designerRepUser.name}:`, notifError);
        // Do not fail the whole action, just log the error.
      }
    }


    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/projects");

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) {
      return { error: "Failed to retrieve updated order after DR assignment." };
    }
    return updatedOrder;

  } catch (error: any) {
    console.error("Unexpected error in assignDrToOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred during DR assignment.";
    return { error: errorMessage };
  }
}

export async function deleteOrderAction(
  orderId: string, 
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) {
        return { success: false, error: "Order ID is required for deletion." };
    }
    
    const settings = await getGlobalSettings();
    const canDelete = currentUser.role === 'SYSTEM_ADMIN' || (settings.rolesAllowedToDeleteOrders?.includes(currentUser.role) ?? false);

    if (!canDelete) {
      return { success: false, error: "You do not have permission to delete this order." };
    }

    const success = await deleteOrderFromDb(orderId);
    if (success) {
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/dashboard");
      revalidatePath("/(app)/active-orders");
      revalidatePath("/(app)/orders/monthly");
      revalidatePath("/(app)/deliveries/monthly");
      revalidatePath("/(app)/deliveries/weekly");
      revalidatePath("/(app)/projects");
      revalidatePath("/(app)/crm/sow"); // Revalidate SOW page
      return { success: true };
    }
    return { success: false, error: "Failed to delete order from database. Service returned failure." };
  } catch (error: any) {
    console.error("Error in deleteOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while deleting order.";
    return { success: false, error: errorMessage };
  }
}

    
