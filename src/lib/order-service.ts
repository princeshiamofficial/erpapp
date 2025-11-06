

import type { TrackingLink, Comment, OrderLogEntry, OrderItem, AdvancePaymentRecord, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatusById, READY_FOR_DESIGN_STATUS_ID, DELIVERED_STATUS_ID } from './status-service';
import { format, parseISO } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const ORDERS_COLLECTION = 'orders';
const PROJECTS_COLLECTION = 'projects';
const SHIPPED_ORDERS_COLLECTION = 'shippedOrders'; // New collection name

export const getOrders = async (): Promise<TrackingLink[]> => {
  try {
    await ensureCollectionExistsV3(ORDERS_COLLECTION);
    
    // Fetch the most recent orders to prevent server overload issues (like 500 errors).
    const limit = 4444;
    // The V3 API seems to handle ordering differently. Let's adapt to fetch and sort client-side for now.
    // The API might not support `orderBy` and `direction` in the same way.
    const response = await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents?limit=${limit}`);
    
    if (response && Array.isArray(response.documents)) {
        const orders = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as TrackingLink));
        // Sort client-side
        return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error) {
        console.error("Error fetching orders from API v3:", error.message);
        throw new Error(`Failed to fetch orders: ${error.message}`);
    } else {
        console.error("An unknown error occurred while fetching orders from API v3:", error);
        throw new Error("An unknown error occurred while fetching orders.");
    }
  }
};


export const getOrderById = async (id: string): Promise<TrackingLink | undefined> => {
  if (!id) return undefined;
  try {
    const response = await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents/${id}`);
    if (response && response.data) {
        return { id: response.id, ...response.data } as TrackingLink;
    }
    return undefined;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      return undefined;
    }
    console.error("Error fetching order by ID from API v3:", error);
    return undefined;
  }
};

export const getOrderByTrackingCode = async (trackingCode: string): Promise<TrackingLink | null> => {
  if (!trackingCode) return null;
  try {
    // V3 API uses a 'search' param instead of structured filters.
    await ensureCollectionExistsV3(ORDERS_COLLECTION);
    const response = await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents?search=${trackingCode}&limit=4444`);
    if (response && Array.isArray(response.documents)) {
      // We must filter client-side as 'search' is broad.
      const foundOrder = response.documents.find((doc: { id: string, data: any }) => doc.data.packzyTrackingCode === trackingCode);
      if (foundOrder) {
          return { id: foundOrder.id, ...foundOrder.data } as TrackingLink;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching order by tracking code "${trackingCode}" from API v3:`, error);
    return null;
  }
};

export const getOrdersByStatusAndTracking = async (statusId: string, onlyWithDue: boolean = false): Promise<TrackingLink[]> => {
  try {
    await ensureCollectionExistsV3(ORDERS_COLLECTION);
    
    // Fetch all potentially relevant orders and filter client-side, as V3 search is not ideal for this.
    const response = await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents?limit=4444`);
    if (response && Array.isArray(response.documents)) {
      let orders = response.documents
        .map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as TrackingLink))
        .filter(order => order.currentStatus === statusId);

      if (onlyWithDue) {
        return orders.filter(order => {
          const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
          const effectiveDiscount = order.specialClientDiscount || 0;
          const netPayable = orderSubtotal - effectiveDiscount;
          const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
          const dueAmount = netPayable - totalAdvancePaid;
          return dueAmount > 0.01;
        });
      } else {
        // Filter for orders that have a tracking code
        return orders.filter(order => !!order.packzyTrackingCode);
      }
    }
    return [];
  } catch (error) {
    console.error(`Error fetching orders with status ${statusId} from API v3:`, error);
    return [];
  }
};


export const addOrder = async (orderData: {
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePaymentAmount?: number | null;
  advancePaymentMethod?: string | null;
  advancePaymentDocumentUrl?: string | null;
  newAdvancePaymentNotes?: string | null;
  specialClientDiscount?: number | null;
  shippingCharge?: number | null; 
  orderNotes?: string | null;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string;
  createdAt: string;
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString();

  try {
    await ensureCollectionExistsV3(ORDERS_COLLECTION);
    let finalCreatedAt = orderData.createdAt;
    try {
      finalCreatedAt = parseISO(orderData.createdAt).toISOString();
    } catch (e) {
      finalCreatedAt = new Date().toISOString();
    }

    const currentDate = parseISO(finalCreatedAt);
    const datePrefix = `ORD-${format(currentDate, 'yyyyMMdd')}`;
    
    // Fetch all orders to find the latest sequence number for the day
    const allOrdersResponse = await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents?limit=4444`);
    let newSequence = 1;
    if (allOrdersResponse && Array.isArray(allOrdersResponse.documents)) {
        const sameDayOrders = allOrdersResponse.documents.filter((doc: any) => doc.id.startsWith(datePrefix));
        if (sameDayOrders.length > 0) {
            const lastSequence = Math.max(...sameDayOrders.map((doc: any) => {
                const numPart = parseInt(doc.id.split('-').pop() || '0', 10);
                return isNaN(numPart) ? 0 : numPart;
            }));
            newSequence = lastSequence + 1;
        }
    }
    
    const orderId = `${datePrefix}-${String(newSequence).padStart(3, '0')}`;
    
    const initialLogEntry: OrderLogEntry = {
      id: uuidv4(), timestamp: finalCreatedAt, status: orderData.initialStatusId,
      changedByUserId: orderData.crmUserId, changedByUserName: orderData.crmUserName, notes: "Order created.",
    };

    const initialAdvancePayments: AdvancePaymentRecord[] = [];
    if (orderData.advancePaymentAmount && orderData.advancePaymentAmount > 0) {
      initialAdvancePayments.push({
        id: uuidv4(), amount: orderData.advancePaymentAmount, date: finalCreatedAt,
        paymentMethod: orderData.advancePaymentMethod || "Unknown", 
        notes: orderData.newAdvancePaymentNotes || "Initial advance payment.",
        documentUrl: orderData.advancePaymentDocumentUrl || null,
        recordedByUserId: orderData.crmUserId, recordedByUserName: orderData.crmUserName,
      });
    }

    const newOrderData: Omit<TrackingLink, 'id'> = {
      companyName: orderData.companyName, address: orderData.address, phoneNumber: orderData.phoneNumber,
      orderItems: orderData.orderItems, specialClientDiscount: orderData.specialClientDiscount ?? null,
      shippingCharge: orderData.shippingCharge ?? null, orderNotes: orderData.orderNotes || null,
      crmUserId: orderData.crmUserId, crmUserName: orderData.crmUserName,
      designerRepresentativeId: null, designerRepresentativeName: null,
      assigneeAvatarUrl: null, 
      designerRepresentativeAvatarUrl: null,
      createdAt: finalCreatedAt, updatedAt: transactionTime,
      updatedByUserId: orderData.crmUserId, updatedByUserName: orderData.crmUserName,
      isPublic: false, currentStatus: orderData.initialStatusId,
      statusHistory: [initialLogEntry], comments: [], viewCount: 0,
      advancePayments: initialAdvancePayments,
      packzyConsignmentId: null, packzyTrackingCode: null,
    };
    
    const payload = { id: orderId, data: newOrderData };
    
    await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents`, {
        method: 'POST', body: JSON.stringify(payload)
    });
    
    return { id: orderId, ...newOrderData };

  } catch (error: any) {
    console.error("Error adding order via API v3:", error.message ? error.message : error);
    return null;
  }
};


export const updateOrder = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      throw new Error(`Order ${id} not found.`);
    }

    const finalData = { ...existingOrder, ...updates };
    delete (finalData as any).id; 

    const payload = { data: finalData };
    await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Error updating order ${id} via API v3:`, error);
    return false;
  }
};

export const updateOrdersBatch = async (updates: { id: string, data: Partial<TrackingLink> }[]): Promise<boolean> => {
    if (updates.length === 0) return true;
    try {
        // V3 API might not support batch updates in the same way, so we loop for now.
        // This can be slow but ensures compatibility.
        for (const update of updates) {
            await updateOrder(update.id, update.data);
        }
        return true;
    } catch (error) {
        console.error("Error performing batch update on orders via API v3:", error);
        return false;
    }
};


export const deleteOrder = async (orderId: string): Promise<boolean> => {
  try {
    await fetchFromApiV3(`collections/${ORDERS_COLLECTION}/documents/${orderId}`, { method: 'DELETE' });
    
    try {
        await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents/${orderId}`, { method: 'DELETE' });
    } catch (projectError) {
        if (!(projectError instanceof Error && projectError.message.toLowerCase().includes('not found'))) {
             console.warn(`Could not delete corresponding project for order ${orderId}, it might not exist.`, projectError);
        }
    }
    try {
        await deleteShippedOrderEntry(orderId);
    } catch (shippedError) {
        if (!(shippedError instanceof Error && shippedError.message.toLowerCase().includes('not found'))) {
            console.warn(`Could not delete from shippedOrders for order ${orderId}, it might not exist.`, shippedError);
        }
    }
    return true;
  } catch (error) {
    console.error(`Error deleting order ${orderId} via API v3:`, error);
    return false;
  }
};

export async function autoSettleOrderIfDelivered(
  orderId: string,
  settlementReason: string,
  actingUser: { id: string; name: string }
): Promise<boolean> {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      console.warn(`[autoSettleOrderIfDelivered] Order ${orderId} not found. Cannot settle.`);
      return false;
    }

    const isAlreadyDelivered = order.currentStatus === DELIVERED_STATUS_ID;
    
    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
    const effectiveDiscount = order.specialClientDiscount || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
    const shippingCharge = order.shippingCharge || 0;
    const dueAmount = netPayable + shippingCharge - totalAdvancePaid;

    const updates: Partial<TrackingLink> = {};
    let needsUpdate = false;

    if (dueAmount > 0.01) {
      const settlementRecord: AdvancePaymentRecord = {
        id: uuidv4(), amount: dueAmount, date: new Date().toISOString(), paymentMethod: "COD",
        notes: settlementReason, recordedByUserId: actingUser.id, recordedByUserName: actingUser.name,
      };
      updates.advancePayments = [...(order.advancePayments || []), settlementRecord];
      needsUpdate = true;
    }

    if (!isAlreadyDelivered) {
        updates.currentStatus = DELIVERED_STATUS_ID;
        const newStatusLogEntry: OrderLogEntry = {
            id: uuidv4(), timestamp: new Date().toISOString(), status: DELIVERED_STATUS_ID,
            changedByUserId: actingUser.id, changedByUserName: actingUser.name, notes: settlementReason,
        };
        updates.statusHistory = [...order.statusHistory, newStatusLogEntry];
        needsUpdate = true;
    }
    
    if (needsUpdate) {
      updates.updatedAt = new Date().toISOString();
      updates.updatedByUserId = actingUser.id;
      updates.updatedByUserName = actingUser.name;
      await updateOrder(orderId, updates);
    }
    
    try {
        const project = await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents/${orderId}`);
        if (project && project.data && project.data.status !== 'Delivered') {
            const projectUpdates = {
                status: 'Delivered', deliveredAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            const payload = { data: { ...project.data, ...projectUpdates }};
            await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents/${orderId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
             console.log(`[autoSettleOrderIfDelivered] Synced project ${orderId} to 'Delivered'.`);
        }
    } catch(projectError) {
        if (!(projectError instanceof Error && projectError.message.toLowerCase().includes('not found'))) {
          console.warn(`[autoSettleOrderIfDelivered] Could not sync project status for ${orderId}:`, projectError);
        }
    }
    return true;
  } catch (error) {
    console.error(`Error auto-settling order ${orderId}:`, error);
    return false;
  }
}

export const unsettleOrderPayment = async (
    orderId: string, 
    unsettleReason: string, 
    actingUser: { id: string; name: string }
): Promise<boolean> => {
    try {
        const order = await getOrderById(orderId);
        if (!order) {
            console.warn(`[unsettleOrderPayment] Order ${orderId} not found. Cannot unsettle.`);
            return false;
        }

        const autoSettlePaymentIndex = (order.advancePayments || []).findIndex(
            p => p.notes?.startsWith("System auto-settled:") || p.paymentMethod === "COD" || p.notes?.startsWith("Order delivered.")
        );

        if (autoSettlePaymentIndex === -1) {
            console.log(`[unsettleOrderPayment] No auto-settled payment found for order ${orderId}. No action needed.`);
            return true;
        }

        const updatedPayments = [...(order.advancePayments || [])];
        updatedPayments.splice(autoSettlePaymentIndex, 1);

        const updates: Partial<TrackingLink> = {
            advancePayments: updatedPayments,
            updatedAt: new Date().toISOString(),
            updatedByUserId: actingUser.id,
            updatedByUserName: actingUser.name,
        };

        const newStatusLogEntry: OrderLogEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            status: order.currentStatus, // Keep current status but add note
            changedByUserId: actingUser.id,
            changedByUserName: actingUser.name,
            notes: unsettleReason,
        };
        updates.statusHistory = [...order.statusHistory, newStatusLogEntry];

        await updateOrder(orderId, updates);
        console.log(`[unsettleOrderPayment] Successfully removed auto-settled payment for order ${orderId}.`);
        return true;

    } catch (error) {
        console.error(`Error unsettling payment for order ${orderId}:`, error);
        return false;
    }
};

export const addCommentToOrder = async (orderId: string, commentData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    
    const newComment: Comment = {
      id: uuidv4(), timestamp: new Date().toISOString(), userName: commentData.userName,
      userRole: commentData.userRole, text: commentData.text, isInternal: commentData.isInternal,
      replies: [], likes: { count: 0, reactedBy: [] }, ...(commentData.userId && { userId: commentData.userId }),
    };
    
    const updatedComments = [...(order.comments || []), newComment];
    await updateOrder(orderId, { comments: updatedComments });
    return { ...order, comments: updatedComments };
  } catch (error) {
    console.error(`Error adding comment to order ${orderId} via API v3:`, error);
    return undefined;
  }
};

export const addReplyToComment = async (
  orderId: string, parentCommentId: string, replyData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>
): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);
    
    const comments = order.comments || [];
    const parentCommentIndex = comments.findIndex(c => c.id === parentCommentId);
    if (parentCommentIndex === -1) throw new Error(`Parent comment ${parentCommentId} not found.`);

    const newReply: Comment = {
      id: uuidv4(), timestamp: new Date().toISOString(), userName: replyData.userName,
      userRole: replyData.userRole, text: replyData.text, isInternal: replyData.isInternal,
      replies: [], likes: { count: 0, reactedBy: [] }, ...(replyData.userId && { userId: replyData.userId }),
    };
    
    const parentComment = comments[parentCommentIndex];
    parentComment.replies = [...(parentComment.replies || []), newReply];
    comments[parentCommentIndex] = parentComment;
    
    await updateOrder(orderId, { comments });
    return { ...order, comments };
  } catch (error) {
    console.error(`Error adding reply to comment ${parentCommentId} in order ${orderId} via API v3:`, error);
    return undefined;
  }
};

export const toggleReaction = async (
  orderId: string, targetCommentId: string, isReply: boolean, parentCommentIdIfReply: string | undefined, reactorId: string, reactionType: 'like' 
): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);
    
    const comments = [...(order.comments || [])];
    let targetComment: Comment | undefined;

    if (isReply) {
      if (!parentCommentIdIfReply) throw new Error("parentCommentIdIfReply is required for a reply reaction.");
      const parentComment = comments.find(c => c.id === parentCommentIdIfReply);
      if (!parentComment || !parentComment.replies) throw new Error(`Parent comment ${parentCommentIdIfReply} or its replies not found.`);
      targetComment = parentComment.replies.find(r => r.id === targetCommentId);
    } else {
      targetComment = comments.find(c => c.id === targetCommentId);
    }
    if (!targetComment) throw new Error(`Target comment/reply ${targetCommentId} not found.`);

    targetComment.likes = targetComment.likes || { count: 0, reactedBy: [] };
    const reactedByIndex = targetComment.likes.reactedBy.indexOf(reactorId);
    if (reactedByIndex > -1) {
      targetComment.likes.reactedBy.splice(reactedByIndex, 1);
      targetComment.likes.count = Math.max(0, targetComment.likes.count - 1);
    } else {
      targetComment.likes.reactedBy.push(reactorId);
      targetComment.likes.count += 1;
    }

    await updateOrder(orderId, { comments });
    return { ...order, comments };
  } catch (error) {
    console.error(`Error toggling reaction on comment ${targetCommentId} in order ${orderId} via API v3:`, error);
    return undefined;
  }
};


export const deleteComment = async (
  orderId: string, targetCommentId: string, isReply: boolean, parentCommentIdIfReply: string | undefined
): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    let comments = [...(order.comments || [])];

    if (isReply) {
      if (!parentCommentIdIfReply) throw new Error("parentCommentIdIfReply is required for a reply.");
      const parentCommentIndex = comments.findIndex(c => c.id === parentCommentIdIfReply);
      if (parentCommentIndex === -1) throw new Error(`Parent comment ${parentCommentIdIfReply} not found.`);
      const parentComment = comments[parentCommentIndex];
      parentComment.replies = (parentComment.replies || []).filter(r => r.id !== targetCommentId);
      comments[parentCommentIndex] = parentComment;
    } else {
      comments = comments.filter(c => c.id !== targetCommentId);
    }

    await updateOrder(orderId, { comments });
    return { ...order, comments };
  } catch (error) {
    console.error(`Error deleting comment ${targetCommentId} in order ${orderId} via API v3:`, error);
    return undefined;
  }
};

export const addShippedOrderEntry = async (orderId: string, trackingCode: string): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(SHIPPED_ORDERS_COLLECTION);
    const data = { packzyTrackingCode: trackingCode, addedAt: new Date().toISOString() };
    
    const payload = {
      id: orderId,
      data: data
    };
    
    await fetchFromApiV3(`collections/${SHIPPED_ORDERS_COLLECTION}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    console.log(`[ShippedOrders] Upserted entry for order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`Error upserting to shippedOrders collection for order ${orderId} via API v3:`, error);
    return false;
  }
};

export const deleteShippedOrderEntry = async (orderId: string): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(SHIPPED_ORDERS_COLLECTION);
    await fetchFromApiV3(`collections/${SHIPPED_ORDERS_COLLECTION}/documents/${orderId}`, {
      method: 'DELETE'
    });
    console.log(`[ShippedOrders] Removed entry for order ${orderId}`);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      console.warn(`[ShippedOrders] Tried to delete entry for order ${orderId}, but it was not found.`);
      return true;
    }
    console.error(`Error deleting from shippedOrders collection for order ${orderId} via API v3:`, error);
    return false;
  }
};
