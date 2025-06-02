
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, writeBatch, limit, where, deleteDoc as deleteFirestoreDoc, runTransaction } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry, CustomStatus, UserRole, OrderItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses, READY_FOR_DESIGN_STATUS_ID } from './status-service';
import { format } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

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
    console.error(`seedInitialOrders: Critical default statuses not found by ID, cannot seed initial orders properly. Specifically missing: ${missingDetailed.join(', ')}. Please check that these statuses exist in your Firestore 'customOrderStatuses' collection with their correct IDs, or ensure the status seeding process is complete and successful.`);
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

    const firstOrder: TrackingLink = {
      id: firstOrderId,
      companyName: "TS001 • Tech Solutions Inc.", // Updated format
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101", 
      orderItems: firstOrderItems,
      advancePayment: 1000,
      paymentMethod: "Bank Transfer",
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

    const secondOrder: TrackingLink = {
      id: secondOrderId,
      companyName: "GS002 • GreenScape Ltd.", // Updated format
      address: "456 Green Rd, Meadowville, TX 75001",
      phoneNumber: "555-0102", 
      orderItems: secondOrderItems,
      advancePayment: null,
      paymentMethod: "Cash",
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
    };
    const secondDocRef = doc(ordersRef, secondOrderId);
    batch.set(secondDocRef, secondOrder);
    createdOrders.push(secondOrder);

    await batch.commit();
    console.log('Initial orders seeded in Firestore with updated fields (updatedAt, updatedBy, orderNotes).');
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
      // console.log("No orders found in Firestore, seeding defaults.");
      // orders = await seedInitialOrders(); // Seeding disabled by default
    } else {
      orders = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as TrackingLink));
    }
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

export const addOrder = async (orderData: {
  companyName: string; // This will be the combined "Job ID • Company Name"
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePayment?: number | null;
  paymentMethod?: string | null;
  orderNotes?: string | null;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string;
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString();

  try {
    const currentDate = new Date();
    const dateString = format(currentDate, 'yyyyMMdd');
    const idPrefixForToday = `ORD-${dateString}-`;

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('id', '>=', idPrefixForToday),
      where('id', '<', idPrefixForToday + '\uffff'), 
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

    const orderId = `${idPrefixForToday}${String(newSequence).padStart(3, '0')}`;

    const initialLogEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: transactionTime,
      status: orderData.initialStatusId,
      changedByUserId: orderData.crmUserId,
      changedByUserName: orderData.crmUserName,
      notes: "Order created.",
    };

    const newOrder: TrackingLink = {
      id: orderId,
      companyName: orderData.companyName, // Already combined by action
      address: orderData.address,
      phoneNumber: orderData.phoneNumber,
      orderItems: orderData.orderItems, 
      advancePayment: orderData.advancePayment === undefined ? null : orderData.advancePayment,
      paymentMethod: orderData.paymentMethod === undefined ? null : (orderData.paymentMethod || null),
      orderNotes: orderData.orderNotes || null,
      crmUserId: orderData.crmUserId,
      crmUserName: orderData.crmUserName,
      designerRepresentativeId: null,
      designerRepresentativeName: null,
      createdAt: transactionTime,
      updatedAt: transactionTime, 
      updatedByUserId: orderData.crmUserId, 
      updatedByUserName: orderData.crmUserName, 
      isPublic: false,
      currentStatus: orderData.initialStatusId,
      statusHistory: [initialLogEntry],
      comments: [],
      viewCount: 0,
    };

    console.log('Object being sent to Firestore setDoc:', JSON.stringify(newOrder, null, 2));
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
        sanitizedUpdates[key] = value === undefined ? null : value;
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
    await deleteFirestoreDoc(orderDocRef);
    return true;
  } catch (error) {
    console.error(`Error deleting order ${orderId} from Firestore:`, error);
    return false;
  }
};

export const addCommentToOrder = async (orderId: string, commentData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>): Promise<TrackingLink | undefined> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    return await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        console.error(`addCommentToOrder: Order ${orderId} not found.`);
        throw new Error(`Order ${orderId} not found.`);
      }

      const order = { ...orderDoc.data(), id: orderDoc.id } as TrackingLink;
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

      const updatedComments = [...(order.comments || []), newComment];
      transaction.update(orderRef, { comments: updatedComments });
      return { ...order, comments: updatedComments };
    }).catch(error => {
      console.error(`TRANSACTION FAILED for adding comment to order ${orderId}:`, error);
      return undefined;
    });
  } catch (error) {
    console.error(`Error adding comment to order ${orderId}:`, error);
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
        console.error(`addReplyToComment: Order ${orderId} not found.`);
        throw new Error(`Order ${orderId} not found.`);
      }

      const order = { ...orderDoc.data(), id: orderDoc.id } as TrackingLink;
      const comments = order.comments || [];
      const parentCommentIndex = comments.findIndex(c => c.id === parentCommentId);

      if (parentCommentIndex === -1) {
        console.error(`addReplyToComment: Parent comment ${parentCommentId} not found in order ${orderId}.`);
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
        console.error(`toggleReaction: Order ${orderId} not found.`);
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
        console.error(`toggleReaction: Target comment/reply ${targetCommentId} not found.`);
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

export const incrementOrderViewCount = async (orderId: string): Promise<boolean> => {
  if (!orderId) return false;
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        console.warn(`Order ${orderId} not found for incrementing view count.`);
        return;
      }
      const currentViewCount = orderDoc.data().viewCount || 0;
      transaction.update(orderRef, { viewCount: currentViewCount + 1 });
    });
    return true;
  } catch (error) {
    console.error(`Error incrementing view count for order ${orderId}:`, error);
    return false;
  }
};

