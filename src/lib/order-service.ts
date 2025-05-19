
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, writeBatch, limit, where, deleteDoc, runTransaction } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry, CustomStatus, UserRole, OrderItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses, READY_FOR_DESIGN_STATUS_ID } from './status-service'; // Assuming getStatuses returns all statuses correctly
import { format } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

// Status IDs for seeding
const ORDER_SUBMITTED_ID = 'order-submitted';
const IN_PRODUCTION_ID = 'in-production';
const PENDING_CLIENT_APPROVAL_ID = 'pending-client-approval';


// Note: Seeding is now typically handled by initial UI interaction if collections are empty.
// This function can be used for manual seeding or testing if needed.
export const seedInitialOrders = async (): Promise<TrackingLink[]> => {
  const statuses: CustomStatus[] = await getStatuses();

  const orderSubmittedStatus = statuses.find(s => s.id === ORDER_SUBMITTED_ID);
  const inProductionStatus = statuses.find(s => s.id === IN_PRODUCTION_ID);
  const pendingApprovalStatus = statuses.find(s => s.id === PENDING_CLIENT_APPROVAL_ID);
  const readyForDesignStatus = statuses.find(s => s.id === READY_FOR_DESIGN_STATUS_ID);

  const missingDetailed: string[] = [];
  if (!orderSubmittedStatus) missingDetailed.push(`ID: '${ORDER_SUBMITTED_ID}'`);
  if (!inProductionStatus) missingDetailed.push(`ID: '${IN_PRODUCTION_ID}'`);
  if (!pendingApprovalStatus) missingDetailed.push(`ID: '${PENDING_CLIENT_APPROVAL_ID}'`);
  if (!readyForDesignStatus) missingDetailed.push(`ID: '${READY_FOR_DESIGN_STATUS_ID}'`);

  if (missingDetailed.length > 0) {
    console.error(`seedInitialOrders: Default statuses not found by ID, cannot seed initial orders properly. Specifically missing status IDs: ${missingDetailed.join(', ')}. Please ensure these system statuses exist in your Firestore 'customOrderStatuses' collection or that the status seeding mechanism is working correctly.`);
    return [];
  }
  
  // Ensure all status objects are defined before proceeding
  if (!orderSubmittedStatus || !inProductionStatus || !pendingApprovalStatus || !readyForDesignStatus) {
     console.error("seedInitialOrders: One or more critical status objects are undefined after attempting to find them by ID. Aborting seedInitialOrders.");
     return [];
  }

  type SeedOrderBase = Omit<TrackingLink, 'id' | 'createdAt' | 'statusHistory' | 'comments' | 'currentStatus' | 'viewCount' | 'isPublic' | 'orderItems'>;

  const initialOrdersData: SeedOrderBase[] = [
    {
      customerName: "Tech Solutions Inc.",
      companyName: "Tech Solutions Inc.",
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101",
      crmUserId: "SysAdmin-001",
      crmUserName: "Default Admin",
      designerRepresentativeId: null,
      designerRepresentativeName: null,
    },
    {
      customerName: "GreenScape Ltd.",
      companyName: "GreenScape Ltd.",
      address: "456 Green Rd, Meadowville, TX 75001",
      phoneNumber: "555-0102",
      crmUserId: "SysAdmin-001",
      crmUserName: "Default Admin",
      designerRepresentativeId: null,
      designerRepresentativeName: null,
    },
  ];

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const createdOrders: TrackingLink[] = [];
  const batch = writeBatch(db);

  try {
    const dateTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const dateStringTwoDaysAgo = format(dateTwoDaysAgo, 'yyyyMMdd');
    const firstOrderId = `ORD-${dateStringTwoDaysAgo}-001`;
    const firstOrderBaseData = initialOrdersData[0];

    const firstOrderItems: OrderItem[] = [{ id: uuidv4(), model: "Premium Matte", quantity: 500, lamination: "Soft Touch" }];

    const firstOrder: TrackingLink = {
      ...firstOrderBaseData,
      id: firstOrderId,
      createdAt: dateTwoDaysAgo.toISOString(),
      currentStatus: inProductionStatus.id,
      orderItems: firstOrderItems,
      statusHistory: [
        { id: uuidv4(), timestamp: dateTwoDaysAgo.toISOString(), status: orderSubmittedStatus.id, changedByUserId: firstOrderBaseData.crmUserId, changedByUserName: firstOrderBaseData.crmUserName, notes: "Order created, requirements gathered." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: inProductionStatus.id, changedByUserId: firstOrderBaseData.crmUserId, changedByUserName: firstOrderBaseData.crmUserName, notes: "Production has commenced." }
      ],
      comments: [
        { id: uuidv4(), userName: "Tech Solutions Inc. (Client)", userRole: 'Client', text: "Looking forward to the first demo!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), isInternal: false, replies: [], likes: { count: 0, reactedBy: []} }
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
    const secondOrderBaseData = initialOrdersData[1];

    const secondOrderItems: OrderItem[] = [{ id: uuidv4(), model: "Eco-Friendly Recycled", quantity: 1000, lamination: "None" }];

    const secondOrder: TrackingLink = {
      ...secondOrderBaseData,
      id: secondOrderId,
      createdAt: dateOneDayAgo.toISOString(),
      currentStatus: pendingApprovalStatus.id,
      orderItems: secondOrderItems,
      statusHistory: [
        { id: uuidv4(), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: orderSubmittedStatus.id, changedByUserId: secondOrderBaseData.crmUserId, changedByUserName: secondOrderBaseData.crmUserName, notes: "New landscaping project initiated." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: readyForDesignStatus.id, changedByUserId: secondOrderBaseData.crmUserId, changedByUserName: secondOrderBaseData.crmUserName, notes: "Order ready for design team." },
        { id: uuidv4(), timestamp: dateOneDayAgo.toISOString(), status: pendingApprovalStatus.id, changedByUserId: "DR-001", changedByUserName: "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
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
    console.log('Initial orders seeded in Firestore with new ID format and viewCount.');
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
      console.log("No orders found in Firestore. Initial orders will be created if the 'Seed Orders' button is clicked or on first use that triggers seeding.");
      // Consider removing automatic seeding on getOrders() if it's not desired.
      // orders = await seedInitialOrders(); 
    } else {
      orders = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as TrackingLink));
    }
  } catch (error) {
    console.error("Error fetching orders from Firestore:", error);
    // Removed automatic seeding on fetch error to prevent loops/unexpected behavior.
    // Consider a more specific error handling or retry mechanism if needed.
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
  customerName: string;
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[]; // Updated to use the OrderItem[] type
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
      customerName: orderData.customerName,
      companyName: orderData.companyName,
      address: orderData.address,
      phoneNumber: orderData.phoneNumber,
      orderItems: orderData.orderItems, // Save the array of order items
      crmUserId: orderData.crmUserId,
      crmUserName: orderData.crmUserName,
      createdAt: transactionTime,
      statusHistory: [initialLogEntry],
      comments: [],
      isPublic: false,
      currentStatus: orderData.initialStatusId,
      designerRepresentativeId: null,
      designerRepresentativeName: null,
      viewCount: 0,
    };
    
    console.log('Object being sent to Firestore setDoc:', JSON.stringify(newOrder, null, 2)); // Log the object
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderDocRef, newOrder);
    return newOrder;

  } catch (error) {
    console.error("Error adding order to Firestore:", error);
    return null; // Return null on error to be handled by the server action
  }
};

export const updateOrder = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const orderDoc = doc(db, ORDERS_COLLECTION, id);
    const sanitizedUpdates: { [key: string]: any } = {};

    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        const value = updates[key as keyof TrackingLink];
        // Firestore does not allow 'undefined'. Convert to 'null' or omit.
        // For simplicity here, we'll convert undefined to null.
        // A more robust solution might involve a schema or deeper validation.
        sanitizedUpdates[key] = value === undefined ? null : value;
      }
    }
    
    if (Object.keys(sanitizedUpdates).length === 0) {
      console.log(`updateOrder: No updates to apply for order ${id}.`);
      return true;
    }

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
    await deleteDoc(orderDocRef);
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
        likes: { count: 0, reactedBy: [] },
        ...(replyData.userId && { userId: replyData.userId }),
      };

      const parentComment = comments[parentCommentIndex];
      parentComment.replies = [...(parentComment.replies || []), newReply];
      
      const updatedComments = [...comments];
      updatedComments[parentCommentIndex] = parentComment;

      transaction.update(orderRef, { comments: updatedComments });
      return { ...order, comments: updatedComments };
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
      
      // Firestore update needs the entire comments array
      // Find the top-level comment index to update
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
      return { ...order, comments: comments }; // Return the modified order object
    });
  } catch (error) {
    console.error(`Error toggling reaction on comment ${targetCommentId} in order ${orderId}:`, error);
    return undefined;
  }
};

export const incrementOrderViewCount = async (orderId: string): Promise<boolean> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        console.warn(`Order ${orderId} not found for incrementing view count.`);
        return; // Exit transaction if order not found
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

    