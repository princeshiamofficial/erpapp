
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, writeBatch, runTransaction, limit, where } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry, CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses } from './status-service';
import { format } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

const seedInitialOrders = async (): Promise<TrackingLink[]> => {
  const statuses: CustomStatus[] = await getStatuses();

  const orderSubmittedStatus = statuses.find(s => s.name === 'Order Submitted');
  const inProductionStatus = statuses.find(s => s.name === 'In Production');
  const pendingApprovalStatus = statuses.find(s => s.name === 'Pending Client Approval');
  const readyForDesignStatus = statuses.find(s => s.name === 'Ready for Design');

  if (!orderSubmittedStatus || !inProductionStatus || !pendingApprovalStatus || !readyForDesignStatus) {
    console.error("Default statuses not found, cannot seed initial orders properly.");
    return [];
  }

  type SeedOrderBase = Omit<TrackingLink, 'id' | 'createdAt' | 'statusHistory' | 'comments' | 'currentStatus' | 'viewCount'> & {
    phoneNumber?: string;
    service?: string;
    designerRepresentativeId?: string;
    designerRepresentativeName?: string;
  };

  const initialOrdersData: SeedOrderBase[] = [
    {
      customerName: "Tech Solutions Inc.",
      companyName: "Tech Solutions Inc.",
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101",
      service: "Custom Software Development",
      crmUserId: "SysAdmin-001",
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
      service: "Landscaping Design Package",
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

  // Order 1 (2 days ago)
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
    phoneNumber: firstOrderBaseData.phoneNumber || null,
    service: firstOrderBaseData.service || null,
    designerRepresentativeId: firstOrderBaseData.designerRepresentativeId || null,
    designerRepresentativeName: firstOrderBaseData.designerRepresentativeName || null,
    viewCount: 0,
  };
  const firstDocRef = doc(ordersRef, firstOrderId);
  batch.set(firstDocRef, firstOrder);
  createdOrders.push(firstOrder);

  // Order 2 (1 day ago)
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
      { id: uuidv4(), timestamp: dateOneDayAgo.toISOString(), status: pendingApprovalStatus.id, changedByUserId: secondOrderBaseData.designerRepresentativeId || "DR-001", changedByUserName: secondOrderBaseData.designerRepresentativeName || "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
    ],
    comments: [],
    phoneNumber: secondOrderBaseData.phoneNumber || null,
    service: secondOrderBaseData.service || null,
    designerRepresentativeId: secondOrderBaseData.designerRepresentativeId || null,
    designerRepresentativeName: secondOrderBaseData.designerRepresentativeName || null,
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
  service?: string;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString(); // Use a single timestamp for consistency

  try {
    const currentDate = new Date();
    const dateString = format(currentDate, 'yyyyMMdd'); // YYYYMMDD format
    const idPrefixForToday = `ORD-${dateString}-`;

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('id', '>=', idPrefixForToday),
      where('id', '<', idPrefixForToday + '\uffff'), // Lexicographical upper bound
      orderBy('id', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    let newSequence = 1;

    if (!querySnapshot.empty) {
      const lastOrderIdToday = querySnapshot.docs[0].id;
      const parts = lastOrderIdToday.split('-');
      if (parts.length === 3) { // Expecting ORD-YYYYMMDD-NNN
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
      service: orderData.service || null,
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
        if (value !== undefined) { // Check for undefined explicitly
          sanitizedUpdates[key] = value;
        } else {
           // If the intention is to remove a field, Firestore might require `FieldValue.delete()`
           // For simplicity, if a field in `updates` is undefined, we'll set it to null
           // or you might choose to not include it in `sanitizedUpdates` if your model allows fields to be absent.
          sanitizedUpdates[key] = null;
        }
      }
    }
    await updateDoc(orderDoc, sanitizedUpdates);
    return true;
  } catch (error) {
    console.error(`Error updating order ${id}:`, error);
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
      
      // Only add userId if it's actually provided and not undefined
      if (commentData.userId !== undefined) {
        newComment.userId = commentData.userId;
      }

      const updatedComments = [...(order.comments || []), newComment];
      transaction.update(orderRef, { comments: updatedComments });

      return { ...order, comments: updatedComments };
    }).catch(transactionError => {
        console.error(`Transaction failed for adding comment to order ${orderId}:`, transactionError);
        return undefined; // Explicitly return undefined on transaction failure
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
        // Optionally throw an error or just return if strictness is needed
        return; 
      }
      const currentViewCount = orderDoc.data().viewCount || 0;
      transaction.update(orderRef, { viewCount: currentViewCount + 1 });
    });
    console.log(`View count incremented for order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`Error incrementing view count for order ${orderId}:`, error);
    return false;
  }
};
