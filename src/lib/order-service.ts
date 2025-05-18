
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, writeBatch, runTransaction, limit, where, deleteDoc } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry, CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses, READY_FOR_DESIGN_STATUS_ID } from './status-service';
import { format } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

const ORDER_SUBMITTED_ID = 'order-submitted';
const IN_PRODUCTION_ID = 'in-production';
const PENDING_CLIENT_APPROVAL_ID = 'pending-client-approval';


const seedInitialOrders = async (): Promise<TrackingLink[]> => {
  const statuses: CustomStatus[] = await getStatuses();

  const orderSubmittedStatus = statuses.find(s => s.id === ORDER_SUBMITTED_ID);
  const inProductionStatus = statuses.find(s => s.id === IN_PRODUCTION_ID);
  const pendingApprovalStatus = statuses.find(s => s.id === PENDING_CLIENT_APPROVAL_ID);
  const readyForDesignStatus = statuses.find(s => s.id === READY_FOR_DESIGN_STATUS_ID);

  const missingDetailed: string[] = [];
  if (!orderSubmittedStatus) missingDetailed.push(`ID: '${ORDER_SUBMITTED_ID}' (Expected Name: Order Submitted)`);
  if (!inProductionStatus) missingDetailed.push(`ID: '${IN_PRODUCTION_ID}' (Expected Name: In Production)`);
  if (!pendingApprovalStatus) missingDetailed.push(`ID: '${PENDING_CLIENT_APPROVAL_ID}' (Expected Name: Pending Client Approval)`);
  if (!readyForDesignStatus) missingDetailed.push(`ID: '${READY_FOR_DESIGN_STATUS_ID}' (Expected Name: Ready for Design)`);


  if (missingDetailed.length > 0) {
    console.error(`Default statuses not found, cannot seed initial orders properly. Specifically missing by ID: ${missingDetailed.join(', ')}. Please check that these statuses exist in your Firestore 'customOrderStatuses' collection with these exact IDs, or ensure the status seeding process is complete and successful.`);
    return [];
  }
  
  // Ensure all found statuses are not undefined before proceeding
  if (!orderSubmittedStatus || !inProductionStatus || !pendingApprovalStatus || !readyForDesignStatus) {
    console.error("One or more critical status objects are undefined even after attempting to find them by ID. Aborting seedInitialOrders.");
    return [];
  }

  type SeedOrderBase = Omit<TrackingLink, 'id' | 'createdAt' | 'statusHistory' | 'comments' | 'currentStatus' | 'viewCount' | 'service'> & {
    phoneNumber?: string;
    model?: string;
    quantity?: number;
    lamination?: string;
    designerRepresentativeId?: string | null;
    designerRepresentativeName?: string | null;
  };

  const initialOrdersData: SeedOrderBase[] = [
    {
      customerName: "Tech Solutions Inc.",
      companyName: "Tech Solutions Inc.",
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101",
      model: "Premium Matte",
      quantity: 500,
      lamination: "Soft Touch",
      crmUserId: "SysAdmin-001", // Assuming a SysAdmin creates these for demo
      crmUserName: "Default Admin",
      isPublic: true,
      designerRepresentativeId: null,
      designerRepresentativeName: null,
    },
    {
      customerName: "GreenScape Ltd.",
      companyName: "GreenScape Ltd.",
      address: "456 Green Rd, Meadowville, TX 75001",
      phoneNumber: "555-0102",
      model: "Eco-Friendly Recycled",
      quantity: 1000,
      lamination: "None",
      crmUserId: "SysAdmin-001",
      crmUserName: "Default Admin",
      isPublic: false,
      designerRepresentativeId: null,
      designerRepresentativeName: null,
    },
  ];

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const createdOrders: TrackingLink[] = [];
  const batch = writeBatch(db);

  const dateTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const dateStringTwoDaysAgo = format(dateTwoDaysAgo, 'yyyyMMdd');
  const firstOrderId = `ORD-${dateStringTwoDaysAgo}-001`;
  const firstOrderBaseData = initialOrdersData[0];
  const firstOrder: TrackingLink = {
    ...firstOrderBaseData,
    id: firstOrderId,
    createdAt: dateTwoDaysAgo.toISOString(),
    currentStatus: inProductionStatus.id,
    statusHistory: [
      { id: uuidv4(), timestamp: dateTwoDaysAgo.toISOString(), status: orderSubmittedStatus.id, changedByUserId: firstOrderBaseData.crmUserId, changedByUserName: firstOrderBaseData.crmUserName, notes: "Order created, requirements gathered." },
      { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: inProductionStatus.id, changedByUserId: firstOrderBaseData.crmUserId, changedByUserName: firstOrderBaseData.crmUserName, notes: "Production has commenced." }
    ],
    comments: [
      { id: uuidv4(), userName: "Tech Solutions Inc. (Client)", text: "Looking forward to the first demo!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), isInternal: false }
    ],
    service: null, // explicitly setting old field to null
    phoneNumber: firstOrderBaseData.phoneNumber || null,
    model: firstOrderBaseData.model || null,
    quantity: firstOrderBaseData.quantity || null,
    lamination: firstOrderBaseData.lamination || null,
    designerRepresentativeId: firstOrderBaseData.designerRepresentativeId || null,
    designerRepresentativeName: firstOrderBaseData.designerRepresentativeName || null,
    viewCount: 0,
  };
  const firstDocRef = doc(ordersRef, firstOrderId);
  batch.set(firstDocRef, firstOrder);
  createdOrders.push(firstOrder);

  const dateOneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const dateStringOneDayAgo = format(dateOneDayAgo, 'yyyyMMdd');
  const secondOrderId = `ORD-${dateStringOneDayAgo}-001`;
  const secondOrderBaseData = initialOrdersData[1];
  const secondOrder: TrackingLink = {
    ...secondOrderBaseData,
    id: secondOrderId,
    createdAt: dateOneDayAgo.toISOString(),
    currentStatus: pendingApprovalStatus.id,
    statusHistory: [
      { id: uuidv4(), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: orderSubmittedStatus.id, changedByUserId: secondOrderBaseData.crmUserId, changedByUserName: secondOrderBaseData.crmUserName, notes: "New landscaping project initiated." },
      { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: readyForDesignStatus.id, changedByUserId: secondOrderBaseData.crmUserId, changedByUserName: secondOrderBaseData.crmUserName, notes: "Order ready for design team." },
      { id: uuidv4(), timestamp: dateOneDayAgo.toISOString(), status: pendingApprovalStatus.id, changedByUserId: "DR-001", changedByUserName: "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
    ],
    comments: [],
    service: null, // explicitly setting old field to null
    phoneNumber: secondOrderBaseData.phoneNumber || null,
    model: secondOrderBaseData.model || null,
    quantity: secondOrderBaseData.quantity || null,
    lamination: secondOrderBaseData.lamination || null,
    designerRepresentativeId: "DR-001",
    designerRepresentativeName: "Carol DesignerRep",
    viewCount: 0,
  };
  const secondDocRef = doc(ordersRef, secondOrderId);
  batch.set(secondDocRef, secondOrder);
  createdOrders.push(secondOrder);

  try {
    await batch.commit();
    console.log('Initial orders seeded in Firestore with new ID format and viewCount.');
  } catch (error) {
    console.error("Error seeding initial orders:", error);
    return [];
  }
  return createdOrders;
};

export const getOrders = async (): Promise<TrackingLink[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No orders found in Firestore, attempting to seed initial orders.");
      return await seedInitialOrders();
    }
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as TrackingLink));
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
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
  phoneNumber?: string;
  // service?: string; // Replaced
  model?: string;
  quantity?: number;
  lamination?: string;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string
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
      phoneNumber: orderData.phoneNumber || null,
      service: null, // Old field, explicitly set to null
      model: orderData.model || null,
      quantity: orderData.quantity || null,
      lamination: orderData.lamination || null,
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

    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderDocRef, newOrder);
    return newOrder;
  } catch (error) {
    console.error("Error adding order to Firestore:", error);
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
        // Ensure undefined values are converted to null for Firestore compatibility
        sanitizedUpdates[key] = value === undefined ? null : value;
      }
    }
    await updateDoc(orderDoc, sanitizedUpdates);
    return true;
  } catch (error) {
    console.error(`Error updating order ${id}:`, error);
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

export const addCommentToOrder = async (orderId: string, commentData: Omit<Comment, 'id' | 'timestamp'>): Promise<TrackingLink | undefined> => {
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
        text: commentData.text,
        isInternal: commentData.isInternal,
      };

      // Only include userId if it's actually provided and not undefined/null
      if (commentData.userId) {
        newComment.userId = commentData.userId;
      }


      const updatedComments = [...(order.comments || []), newComment];
      transaction.update(orderRef, { comments: updatedComments });

      return { ...order, comments: updatedComments };
    }).catch(transactionError => {
        console.error(`Transaction failed for adding comment to order ${orderId}:`, transactionError);
        return undefined;
    });

  } catch (error) {
    console.error(`Error adding comment to order ${orderId}:`, error);
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
