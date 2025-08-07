

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, writeBatch, limit, where, deleteDoc as deleteFirestoreDoc, runTransaction } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry, CustomStatus, UserRole, OrderItem, AdvancePaymentRecord, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses, READY_FOR_DESIGN_STATUS_ID, DELIVERED_STATUS_ID } from './status-service';
import { format, parseISO } from 'date-fns';

const ORDERS_COLLECTION = 'orders';
const PROJECTS_COLLECTION = 'projects';

// Constants for system status IDs, used for seeding
const ORDER_SUBMITTED_ID = 'order-submitted';
const IN_PRODUCTION_ID = 'in-production';
const PENDING_CLIENT_APPROVAL_ID = 'pending-client-approval';

export const seedInitialOrders = async (): Promise<TrackingLink[]> => {
  const statuses: CustomStatus[] = await getStatuses();

  const orderSubmittedStatus = statuses.find(s => s.id === ORDER_SUBMITTED_ID);
  const inProductionStatus = statuses.find(s => s.id === IN_PRODUCTION_ID);
  const pendingApprovalStatus = statuses.find(s => s.id === PENDING_CLIENT_APPROVAL_ID);
  const readyForDesignStatus = statuses.find(s => s.id === READY_FOR_DESIGN_STATUS_ID);

  const missingDetailed: string[] = [];
  if (!orderSubmittedStatus) missingDetailed.push(`ID: '${ORDER_SUBMITTED_ID}' (Order Submitted)`);
  if (!inProductionStatus) missingDetailed.push(`ID: '${IN_PRODUCTION_ID}' (In Production)`);
  if (!pendingApprovalStatus) missingDetailed.push(`ID: '${PENDING_CLIENT_APPROVAL_ID}' (Pending Client Approval)`);
  if (!readyForDesignStatus) missingDetailed.push(`ID: '${READY_FOR_DESIGN_STATUS_ID}' (Ready for Design)`);

  if (missingDetailed.length > 0) {
    console.error(`seedInitialOrders: Critical default statuses not found by ID, cannot seed initial orders properly. Specifically missing: ${missingDetailed.join(', ')}.`);
    return [];
  }

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const createdOrders: TrackingLink[] = [];
  const batch = writeBatch(db);

  try {
    const dateTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const dateStringTwoDaysAgo = format(dateTwoDaysAgo, 'yyyyMMdd');
    const firstOrderId = `ORD-${dateStringTwoDaysAgo}-001`;
    const createdAtFirstOrder = dateTwoDaysAgo.toISOString();

    const firstOrderItems: OrderItem[] = [{
      id: uuidv4(), model: "Premium Matte", quantity: 500, lamination: "Soft Touch", unitPrice: 15, lineItemTotalPrice: 7500
    }];

    const firstOrderAdvancePayments: AdvancePaymentRecord[] = [{
        id: uuidv4(),
        amount: 1000,
        date: createdAtFirstOrder,
        paymentMethod: "Bank Transfer",
        notes: "Initial advance payment.",
        recordedByUserId: "SysAdmin-001",
        recordedByUserName: "Default Admin"
    }];

    const firstOrder: TrackingLink = {
      id: firstOrderId,
      companyName: "TS001 • Tech Solutions Inc.",
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101",
      orderItems: firstOrderItems,
      specialClientDiscount: 200,
      orderNotes: "Client needs a preview by end of week. High priority.",
      crmUserId: "SysAdmin-001",
      crmUserName: "Default Admin",
      designerRepresentativeId: null,
      designerRepresentativeName: null,
      createdAt: createdAtFirstOrder,
      updatedAt: createdAtFirstOrder,
      updatedByUserId: "SysAdmin-001",
      updatedByUserName: "Default Admin",
      currentStatus: inProductionStatus!.id,
      statusHistory: [
        { id: uuidv4(), timestamp: dateTwoDaysAgo.toISOString(), status: orderSubmittedStatus!.id, changedByUserId: "SysAdmin-001", changedByUserName: "Default Admin", notes: "Order created, requirements gathered." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: inProductionStatus!.id, changedByUserId: "SysAdmin-001", changedByUserName: "Default Admin", notes: "Production has commenced." }
      ],
      comments: [
        { id: uuidv4(), userName: "Tech Solutions Inc. (Client)", userRole: 'Client', text: "Looking forward to the first demo!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), isInternal: false, replies: [], likes: { count: 0, reactedBy: [] } }
      ],
      isPublic: true,
      viewCount: 0,
      advancePayments: firstOrderAdvancePayments, // Use new structure
      advancePayment: null, // Legacy field, set to null
      paymentMethod: null,  // Legacy field, set to null
      packzyConsignmentId: null,
      packzyTrackingCode: null,
    };
    const firstDocRef = doc(ordersRef, firstOrderId);
    batch.set(firstDocRef, firstOrder);
    createdOrders.push(firstOrder);

    const dateOneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const dateStringOneDayAgo = format(dateOneDayAgo, 'yyyyMMdd');
    const secondOrderId = `ORD-${dateStringOneDayAgo}-001`;
    const createdAtSecondOrder = dateOneDayAgo.toISOString();

    const secondOrderItems: OrderItem[] = [{
      id: uuidv4(), model: "Eco-Friendly Recycled", quantity: 1000, lamination: "None", unitPrice: 12.50, lineItemTotalPrice: 12500
    }];
    
    const secondOrderAdvancePayments: AdvancePaymentRecord[] = [{
      id: uuidv4(),
      amount: 0, // No advance for this order as per original seed
      date: createdAtSecondOrder,
      paymentMethod: "Cash", // Original seed had 'Cash' but amount was null
      notes: "Payment on delivery.",
      recordedByUserId: "SysAdmin-001",
      recordedByUserName: "Default Admin"
    }];


    const secondOrder: TrackingLink = {
      id: secondOrderId,
      companyName: "GS002 • GreenScape Ltd.",
      address: "456 Green Rd, Meadowville, TX 75001",
      phoneNumber: "555-0102",
      orderItems: secondOrderItems,
      specialClientDiscount: null,
      orderNotes: "Use eco-friendly inks only. Client is very particular about sustainability.",
      crmUserId: "SysAdmin-001",
      crmUserName: "Default Admin",
      createdAt: createdAtSecondOrder,
      updatedAt: createdAtSecondOrder,
      updatedByUserId: "SysAdmin-001",
      updatedByUserName: "Default Admin",
      currentStatus: pendingApprovalStatus!.id,
      statusHistory: [
        { id: uuidv4(), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: orderSubmittedStatus!.id, changedByUserId: "SysAdmin-001", changedByUserName: "Default Admin", notes: "New landscaping project initiated." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: readyForDesignStatus!.id, changedByUserId: "SysAdmin-001", changedByUserName: "Default Admin", notes: "Order ready for design team." },
        { id: uuidv4(), timestamp: dateOneDayAgo.toISOString(), status: pendingApprovalStatus!.id, changedByUserId: "DR-001", changedByUserName: "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
      ],
      comments: [],
      isPublic: true,
      designerRepresentativeId: "DR-001",
      designerRepresentativeName: "Carol DesignerRep",
      viewCount: 0,
      advancePayments: secondOrderAdvancePayments,
      advancePayment: null,
      paymentMethod: null,
      packzyConsignmentId: null,
      packzyTrackingCode: null,
    };
    const secondDocRef = doc(ordersRef, secondOrderId);
    batch.set(secondDocRef, secondOrder);
    createdOrders.push(secondOrder);

    await batch.commit();
    console.log('Initial orders seeded in Firestore with updated advancePayments structure.');
    return createdOrders;
  } catch (error) {
    console.error("Error seeding initial orders:", error);
    return [];
  }
};

export const getOrders = async (): Promise<TrackingLink[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  let orders: TrackingLink[] = [];
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      // orders = await seedInitialOrders(); // Seeding disabled by default
    } else {
      orders = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as TrackingLink));
    }

    // --- BEGIN BACKGROUND SETTLEMENT ---
    // This task runs in the background and does not block the return of the orders list.
    const backgroundSettle = async () => {
        try {
            const deliveredStatusId = DELIVERED_STATUS_ID;
            
            const ordersToCheck = orders.filter(o => o.currentStatus === deliveredStatusId);
            if (ordersToCheck.length === 0) return; // No delivered orders to check.

            const allUsers = await import('@/lib/user-service').then(m => m.getUsers());
            const systemAdmin = allUsers.find(u => u.role === 'SYSTEM_ADMIN');
            if (!systemAdmin) {
                console.warn('[backgroundSettle] No System Admin user found to perform background settlement.');
                return;
            }
            const actingUser = { id: systemAdmin.id, name: systemAdmin.name };
            let settledCount = 0;

            for (const order of ordersToCheck) {
                const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
                const effectiveDiscount = order.specialClientDiscount || 0;
                const netPayable = orderSubtotal - effectiveDiscount;
                const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
                const shippingCharge = order.shippingCharge || 0;
                const dueAmount = netPayable + shippingCharge - totalAdvancePaid;

                if (dueAmount > 0.01) {
                    console.log(`[backgroundSettle] Found delivered order ${order.id} with due amount ${dueAmount}. Settling...`);
                    // Call autoSettle which is defined in this same file.
                    await autoSettleOrderIfDelivered(order.id, "System background check for delivered orders with due balance.", actingUser);
                    settledCount++;
                }
            }
            if (settledCount > 0) {
                console.log(`[backgroundSettle] Successfully auto-settled ${settledCount} previously delivered orders.`);
                // No revalidatePath needed here; the next getOrders call will reflect the changes.
            }
        } catch (error) {
            console.error('[backgroundSettle] Error during background order settlement:', error);
        }
    };

    // Fire and forget the background task
    if (process.env.NODE_ENV !== 'test') { // Avoid running this during tests
      backgroundSettle();
    }
    // --- END BACKGROUND SETTLEMENT ---


  } catch (error) {
    console.error("Error fetching orders from Firestore:", error);
    return [];
  }
  return orders;
};

export const getOrderById = async (id: string): Promise<TrackingLink | undefined> => {
  if (!id) return undefined;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as TrackingLink;
    }
    console.warn(`Order with ID "${id}" not found.`);
    return undefined;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return undefined;
  }
};

export const getOrderByTrackingCode = async (trackingCode: string): Promise<TrackingLink | null> => {
  if (!trackingCode) return null;
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(ordersRef, where("packzyTrackingCode", "==", trackingCode), limit(1));
  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const orderDoc = querySnapshot.docs[0];
      return { ...orderDoc.data(), id: orderDoc.id } as TrackingLink;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching order by tracking code "${trackingCode}":`, error);
    return null;
  }
};

export const addOrder = async (orderData: {
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePaymentAmount?: number | null;
  specialClientDiscount?: number | null;
  shippingCharge?: number | null; // Added
  advancePaymentMethod?: string | null;
  orderNotes?: string | null;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string;
  createdAt: string;
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString();

  try {
    let finalCreatedAt = orderData.createdAt;
    try {
      finalCreatedAt = parseISO(orderData.createdAt).toISOString();
    } catch (e) {
      console.warn(`Invalid createdAt string: ${orderData.createdAt}. Defaulting to current time.`);
      finalCreatedAt = new Date().toISOString();
    }

    const currentDate = parseISO(finalCreatedAt);
    const dateString = format(currentDate, 'yyyyMMdd');
    const idPrefixForDay = `ORD-${dateString}-`;

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('id', '>=', idPrefixForDay),
      where('id', '<', idPrefixForDay + '\uffff'),
      orderBy('id', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    let newSequence = 1;
    if (!querySnapshot.empty) {
      const lastOrderIdToday = querySnapshot.docs[0].id;
      const parts = lastOrderIdToday.split('-');
      if (parts.length === 3) {
        const lastSequenceToday = parseInt(parts[2], 10);
        if (!isNaN(lastSequenceToday)) {
          newSequence = lastSequenceToday + 1;
        }
      }
    }
    const orderId = `${idPrefixForDay}${String(newSequence).padStart(3, '0')}`;

    const initialLogEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: finalCreatedAt,
      status: orderData.initialStatusId,
      changedByUserId: orderData.crmUserId,
      changedByUserName: orderData.crmUserName,
      notes: "Order created.",
    };

    const initialAdvancePayments: AdvancePaymentRecord[] = [];
    if (orderData.advancePaymentAmount && orderData.advancePaymentAmount > 0) {
      initialAdvancePayments.push({
        id: uuidv4(),
        amount: orderData.advancePaymentAmount,
        date: finalCreatedAt, // Payment recorded at order creation time
        paymentMethod: orderData.advancePaymentMethod || "Unknown",
        notes: "Initial advance payment.",
        recordedByUserId: orderData.crmUserId,
        recordedByUserName: orderData.crmUserName,
      });
    }

    const newOrder: TrackingLink = {
      id: orderId,
      companyName: orderData.companyName,
      address: orderData.address,
      phoneNumber: orderData.phoneNumber,
      orderItems: orderData.orderItems,
      specialClientDiscount: orderData.specialClientDiscount === undefined ? null : orderData.specialClientDiscount,
      shippingCharge: orderData.shippingCharge === undefined ? null : orderData.shippingCharge,
      orderNotes: orderData.orderNotes || null,
      crmUserId: orderData.crmUserId,
      crmUserName: orderData.crmUserName,
      designerRepresentativeId: null,
      designerRepresentativeName: null,
      createdAt: finalCreatedAt,
      updatedAt: transactionTime,
      updatedByUserId: orderData.crmUserId,
      updatedByUserName: orderData.crmUserName,
      isPublic: false,
      currentStatus: orderData.initialStatusId,
      statusHistory: [initialLogEntry],
      comments: [],
      viewCount: 0,
      advancePayments: initialAdvancePayments,
      advancePayment: null, 
      paymentMethod: null, 
      packzyConsignmentId: null,
      packzyTrackingCode: null,
    };

    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderDocRef, newOrder);
    return newOrder;

  } catch (error: any) {
    console.error("Error adding order to Firestore in addOrder:", error.message ? error.message : error);
    return null;
  }
};

export const updateOrder = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const orderDoc = doc(db, ORDERS_COLLECTION, id);
    const sanitizedUpdates: { [key: string]: any } = {};

    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        const value = updates[key as keyof TrackingLink];
        if (key === 'specialClientDiscount' || key === 'shippingCharge') {
          sanitizedUpdates[key] = (value === undefined || value === '' || isNaN(Number(value))) ? null : Number(value);
        } else if (key === 'createdAt' && typeof value === 'string') {
          try {
            sanitizedUpdates[key] = parseISO(value).toISOString();
          } catch (e) {
            console.warn(`Invalid createdAt string in update for order ${id}: ${value}. Skipping update for this field.`);
            continue;
          }
        } else if (key === 'advancePayments' && Array.isArray(value)) {
            sanitizedUpdates[key] = value; // Store the whole array
        } else if (key === 'advancePayment' || key === 'paymentMethod') {
            continue;
        }
        else {
          sanitizedUpdates[key] = value === undefined ? null : value;
        }
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      console.log(`updateOrder: No updates to apply for order ${id}.`);
      return true;
    }
    console.log(`updateOrder: Updating order ${id} with:`, JSON.stringify(sanitizedUpdates, null, 2));
    await updateDoc(orderDoc, sanitizedUpdates);
    return true;
  } catch (error) {
    console.error(`Error updating order ${id} in Firestore:`, error);
    return false;
  }
};

export const deleteOrder = async (orderId: string): Promise<boolean> => {
  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    const projectDocRef = doc(db, PROJECTS_COLLECTION, orderId);

    const batch = writeBatch(db);

    batch.delete(orderDocRef);
    batch.delete(projectDocRef);

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error deleting order and corresponding project for ID ${orderId} from Firestore:`, error);
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

    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
    const effectiveDiscount = order.specialClientDiscount || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
    const shippingCharge = order.shippingCharge || 0;
    const dueAmount = netPayable + shippingCharge - totalAdvancePaid;

    const updates: Partial<TrackingLink> = {};
    const logEntriesToAdd: OrderLogEntry[] = [];
    let needsUpdate = false;

    // Settle due amount if necessary
    if (dueAmount > 0.01) { // Use a small epsilon for floating point issues
      console.log(`[autoSettleOrderIfDelivered] Order ${orderId} has a due amount of ${dueAmount}. Auto-settling.`);
      const settlementRecord: AdvancePaymentRecord = {
        id: uuidv4(),
        amount: dueAmount,
        date: new Date().toISOString(),
        paymentMethod: "COD",
        notes: settlementReason,
        recordedByUserId: actingUser.id,
        recordedByUserName: actingUser.name,
      };
      updates.advancePayments = [...(order.advancePayments || []), settlementRecord];
      needsUpdate = true;
    }

    // Ensure status is 'Delivered'
    if (order.currentStatus !== DELIVERED_STATUS_ID) {
      console.log(`[autoSettleOrderIfDelivered] Order ${orderId} status is not 'Delivered'. Updating status.`);
      updates.currentStatus = DELIVERED_STATUS_ID;
      const newStatusLogEntry: OrderLogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        status: DELIVERED_STATUS_ID,
        changedByUserId: actingUser.id,
        changedByUserName: actingUser.name,
        notes: settlementReason,
      };
      logEntriesToAdd.push(newStatusLogEntry);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      updates.statusHistory = [...order.statusHistory, ...logEntriesToAdd];
      updates.updatedAt = new Date().toISOString();
      updates.updatedByUserId = actingUser.id;
      updates.updatedByUserName = actingUser.name;
      await updateOrder(orderId, updates);
      console.log(`[autoSettleOrderIfDelivered] Order ${orderId} successfully processed.`);
    } else {
      console.log(`[autoSettleOrderIfDelivered] Order ${orderId} already settled and in 'Delivered' state. No action taken.`);
    }

    // --- Sync Project Status to Delivered ---
    const projectDocRef = doc(db, PROJECTS_COLLECTION, orderId); // Assuming project ID is same as order ID
    try {
        const projectDocSnap = await getDoc(projectDocRef);
        if (projectDocSnap.exists() && projectDocSnap.data().status !== 'Delivered') {
            console.log(`[autoSettleOrderIfDelivered] Syncing project ${orderId} to 'Delivered' status.`);
            await updateDoc(projectDocRef, {
                status: 'Delivered',
                deliveredAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
    } catch(projectError) {
        console.warn(`[autoSettleOrderIfDelivered] Could not sync project status for ${orderId}. This is non-critical if the project was not persistent. Error:`, projectError);
    }
    // --- End Sync ---

    return true;
  } catch (error) {
    console.error(`[autoSettleOrderIfDelivered] Error settling order ${orderId}:`, error);
    return false;
  }
};


export const addCommentToOrder = async (orderId: string, commentData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>): Promise<TrackingLink | undefined> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    return await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }
      
      const orderData = orderDoc.data() as TrackingLink;
      const currentComments = orderData.comments || [];
      
      const newComment: Comment = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userName: commentData.userName,
        userRole: commentData.userRole,
        text: commentData.text,
        isInternal: commentData.isInternal,
        replies: [],
        likes: { count: 0, reactedBy: [] },
        ...(commentData.userId && { userId: commentData.userId }),
      };
      
      const updatedComments = [...currentComments, newComment];
      transaction.update(orderRef, { comments: updatedComments });
      
      // Return the updated order data after transaction update
      const updatedOrderData = { ...orderData, comments: updatedComments };
      return updatedOrderData;

    });
  } catch (error) {
    console.error(`Transaction failed for adding comment to order ${orderId}:`, error);
    return undefined;
  }
};


export const addReplyToComment = async (
  orderId: string,
  parentCommentId: string,
  replyData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>
): Promise<TrackingLink | undefined> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    return await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        throw new Error(`Order ${orderId} not found.`);
      }
      const order = { ...orderDoc.data(), id: orderDoc.id } as TrackingLink;
      const comments = order.comments || [];
      const parentCommentIndex = comments.findIndex(c => c.id === parentCommentId);
      if (parentCommentIndex === -1) {
        throw new Error(`Parent comment ${parentCommentId} not found.`);
      }
      const newReply: Comment = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userName: replyData.userName,
        userRole: replyData.userRole,
        text: replyData.text,
        isInternal: replyData.isInternal,
        replies: [],
        likes: { count: 0, reactedBy: [] },
        ...(replyData.userId && { userId: replyData.userId }),
      };
      const parentComment = comments[parentCommentIndex];
      parentComment.replies = [...(parentComment.replies || []), newReply];
      const updatedComments = [...comments];
      updatedComments[parentCommentIndex] = parentComment;
      transaction.update(orderRef, { comments: updatedComments });
      return { ...order, comments: updatedComments };
    }).catch(error => {
      console.error(`TRANSACTION FAILED for adding reply to comment ${parentCommentId} in order ${orderId}:`, error);
      return undefined;
    });
  } catch (error) {
    console.error(`Error adding reply to comment ${parentCommentId} in order ${orderId}:`, error);
    return undefined;
  }
};

export const toggleReaction = async (
  orderId: string,
  targetCommentId: string,
  isReply: boolean,
  parentCommentIdIfReply: string | undefined,
  reactorId: string,
  reactionType: 'like'
): Promise<TrackingLink | undefined> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    return await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        throw new Error(`Order ${orderId} not found.`);
      }
      const order = { ...orderDoc.data(), id: orderDoc.id } as TrackingLink;
      let comments = order.comments || [];
      let targetComment: Comment | undefined;
      if (isReply) {
        if (!parentCommentIdIfReply) throw new Error("parentCommentIdIfReply is required for a reply reaction.");
        const parentComment = comments.find(c => c.id === parentCommentIdIfReply);
        if (!parentComment || !parentComment.replies) throw new Error(`Parent comment ${parentCommentIdIfReply} or its replies not found.`);
        targetComment = parentComment.replies.find(r => r.id === targetCommentId);
      } else {
        targetComment = comments.find(c => c.id === targetCommentId);
      }
      if (!targetComment) {
        throw new Error(`Target comment/reply ${targetCommentId} not found.`);
      }
      targetComment.likes = targetComment.likes || { count: 0, reactedBy: [] };
      const reactedByIndex = targetComment.likes.reactedBy.indexOf(reactorId);
      if (reactedByIndex > -1) {
        targetComment.likes.reactedBy.splice(reactedByIndex, 1);
        targetComment.likes.count = Math.max(0, targetComment.likes.count - 1);
      } else {
        targetComment.likes.reactedBy.push(reactorId);
        targetComment.likes.count += 1;
      }
      if (isReply && parentCommentIdIfReply) {
        const parentIdx = comments.findIndex(c => c.id === parentCommentIdIfReply);
        if (parentIdx !== -1) {
          const replyIdx = (comments[parentIdx].replies || []).findIndex(r => r.id === targetCommentId);
          if (replyIdx !== -1 && comments[parentIdx].replies) {
            (comments[parentIdx].replies as Comment[])[replyIdx] = targetComment;
          }
        }
      } else {
        const commentIdx = comments.findIndex(c => c.id === targetCommentId);
        if (commentIdx !== -1) {
          comments[commentIdx] = targetComment;
        }
      }
      transaction.update(orderRef, { comments: comments });
      return { ...order, comments: comments };
    }).catch(error => {
      console.error(`TRANSACTION FAILED for toggling reaction on comment ${targetCommentId} in order ${orderId}:`, error);
      return undefined;
    });
  } catch (error) {
    console.error(`Error toggling reaction on comment ${targetCommentId} in order ${orderId}:`, error);
    return undefined;
  }
};

export const deleteComment = async (
  orderId: string,
  targetCommentId: string,
  isReply: boolean,
  parentCommentIdIfReply: string | undefined
): Promise<TrackingLink | undefined> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    return await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        throw new Error(`Order ${orderId} not found.`);
      }
      const order = { ...orderDoc.data(), id: orderDoc.id } as TrackingLink;
      let comments = order.comments || [];

      if (isReply) {
        if (!parentCommentIdIfReply) throw new Error("parentCommentIdIfReply is required for a reply.");
        const parentCommentIndex = comments.findIndex(c => c.id === parentCommentIdIfReply);
        if (parentCommentIndex === -1) throw new Error(`Parent comment ${parentCommentIdIfReply} not found.`);
        
        const parentComment = comments[parentCommentIndex];
        const initialReplyCount = parentComment.replies?.length || 0;
        parentComment.replies = (parentComment.replies || []).filter(r => r.id !== targetCommentId);
        if (parentComment.replies.length === initialReplyCount) {
            console.warn(`Reply ${targetCommentId} not found in parent ${parentCommentIdIfReply}. No changes made.`);
        }
        comments[parentCommentIndex] = parentComment;
      } else {
        const initialCommentCount = comments.length;
        comments = comments.filter(c => c.id !== targetCommentId);
         if (comments.length === initialCommentCount) {
            console.warn(`Comment ${targetCommentId} not found. No changes made.`);
        }
      }
      
      transaction.update(orderRef, { comments });
      return { ...order, comments };
    }).catch(error => {
      console.error(`TRANSACTION FAILED for deleting comment ${targetCommentId} in order ${orderId}:`, error);
      return undefined;
    });
  } catch (error) {
    console.error(`Error deleting comment ${targetCommentId} in order ${orderId}:`, error);
    return undefined;
  }
};
