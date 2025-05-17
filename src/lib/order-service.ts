
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, getCountFromServer, writeBatch } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry, CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses } from './status-service'; // To get default status IDs

const ORDERS_COLLECTION = 'orders';

// Helper to seed initial orders if the collection is empty
const seedInitialOrders = async (): Promise<TrackingLink[]> => {
  const statuses: CustomStatus[] = await getStatuses(); // Ensure statuses are loaded/seeded
  
  const ideaSubmittedStatus = statuses.find(s => s.name === 'Idea Submitted');
  const inProductionStatus = statuses.find(s => s.name === 'In Production');
  const pendingApprovalStatus = statuses.find(s => s.name === 'Pending Client Approval');
  const readyForDesignStatus = statuses.find(s => s.name === 'Ready for Design');

  if (!ideaSubmittedStatus || !inProductionStatus || !pendingApprovalStatus || !readyForDesignStatus) {
    console.error("Default statuses not found, cannot seed initial orders properly.");
    return [];
  }
  
  // Define base data for seeded orders, explicitly making optional fields part of the type for clarity
  type SeedOrderBase = Omit<TrackingLink, 'id' | 'createdAt' | 'statusHistory' | 'comments' | 'currentStatus'> & {
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
      phoneNumber: "555-0101", // Example: provide or set to null later
      service: "Custom Software Development", // Example: provide or set to null later
      crmUserId: "user-admin-default", 
      crmUserName: "Default Admin",
      isPublic: true,
      // No DR assigned initially for ORD-001
      designerRepresentativeId: undefined, // Will be converted to null
      designerRepresentativeName: undefined, // Will be converted to null
    },
    {
      customerName: "GreenScape Ltd.",
      companyName: "GreenScape Ltd.",
      address: "456 Green Rd, Meadowville, TX 75001",
      phoneNumber: "555-0102",
      service: "Landscaping Design Package",
      crmUserId: "user-admin-default", 
      crmUserName: "Default Admin",
      isPublic: false,
      designerRepresentativeId: "user-dr-001", 
      designerRepresentativeName: "Carol DesignerRep", 
    },
  ];

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const createdOrders: TrackingLink[] = [];
  const batch = writeBatch(db); // Use a batch for seeding

  const firstOrderId = "ORD-001";
  const firstOrderBaseData = initialOrdersData[0];
  const firstOrder: TrackingLink = {
    ...firstOrderBaseData,
    id: firstOrderId,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    currentStatus: inProductionStatus.id,
    statusHistory: [
      { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: ideaSubmittedStatus.id, changedByUserId: firstOrderBaseData.crmUserId, changedByUserName: firstOrderBaseData.crmUserName, notes: "Order created, requirements gathered." },
      { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: inProductionStatus.id, changedByUserId: firstOrderBaseData.crmUserId, changedByUserName: firstOrderBaseData.crmUserName, notes: "Production has commenced." }
    ],
    comments: [
      { id: uuidv4(), userName: "Tech Solutions Inc. (Client)", text: "Looking forward to the first demo!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), isInternal: false }
    ],
    phoneNumber: firstOrderBaseData.phoneNumber || null,
    service: firstOrderBaseData.service || null,
    designerRepresentativeId: firstOrderBaseData.designerRepresentativeId || null,
    designerRepresentativeName: firstOrderBaseData.designerRepresentativeName || null,
  };
  const firstDocRef = doc(ordersRef, firstOrderId);
  batch.set(firstDocRef, firstOrder);
  createdOrders.push(firstOrder);

  const secondOrderId = "ORD-002";
  const secondOrderBaseData = initialOrdersData[1];
  const secondOrder: TrackingLink = {
    ...secondOrderBaseData,
    id: secondOrderId,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    currentStatus: pendingApprovalStatus.id,
    statusHistory: [
      { id: uuidv4(), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: ideaSubmittedStatus.id, changedByUserId: secondOrderBaseData.crmUserId, changedByUserName: secondOrderBaseData.crmUserName, notes: "New landscaping project initiated." },
      { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: readyForDesignStatus.id, changedByUserId: secondOrderBaseData.crmUserId, changedByUserName: secondOrderBaseData.crmUserName, notes: "Order ready for design team." },
      { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: pendingApprovalStatus.id, changedByUserId: secondOrderBaseData.designerRepresentativeId || "user-dr-001", changedByUserName: secondOrderBaseData.designerRepresentativeName || "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
    ],
    comments: [],
    phoneNumber: secondOrderBaseData.phoneNumber || null,
    service: secondOrderBaseData.service || null,
    // designerRepresentativeId and Name are correctly set from secondOrderBaseData if they exist
    designerRepresentativeId: secondOrderBaseData.designerRepresentativeId || null,
    designerRepresentativeName: secondOrderBaseData.designerRepresentativeName || null,
  };
  const secondDocRef = doc(ordersRef, secondOrderId);
  batch.set(secondDocRef, secondOrder);
  createdOrders.push(secondOrder);

  await batch.commit();
  console.log('Initial orders seeded in Firestore with sequential IDs and null for undefined optionals.');
  return createdOrders;
};


export const getOrders = async (): Promise<TrackingLink[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log('No orders found in Firestore, seeding initial orders.');
    return await seedInitialOrders();
  }
  
  return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as TrackingLink));
};

export const getOrderById = async (id: string): Promise<TrackingLink | undefined> => {
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
}): Promise<TrackingLink> => {
  const now = new Date().toISOString();
  
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const snapshot = await getDocs(ordersCol); // Consider optimizing for large collections
  let maxOrderNumber = 0;
  snapshot.forEach(docSnap => {
    const docId = docSnap.id;
    if (docId.startsWith("ORD-")) {
      const numPart = parseInt(docId.substring(4), 10);
      if (!isNaN(numPart) && numPart > maxOrderNumber) {
        maxOrderNumber = numPart;
      }
    }
  });
  const newOrderNumber = maxOrderNumber + 1;
  const orderId = `ORD-${String(newOrderNumber).padStart(3, '0')}`;

  const initialLogEntry: OrderLogEntry = {
    id: uuidv4(),
    timestamp: now,
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
    phoneNumber: orderData.phoneNumber || null, // Set to null if undefined
    service: orderData.service || null, // Set to null if undefined
    crmUserId: orderData.crmUserId,
    crmUserName: orderData.crmUserName,
    createdAt: now,
    statusHistory: [initialLogEntry],
    comments: [],
    isPublic: false, 
    currentStatus: orderData.initialStatusId, 
    designerRepresentativeId: null, // Explicitly null on creation
    designerRepresentativeName: null, // Explicitly null on creation
  };

  const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
  await setDoc(orderDocRef, newOrder);
  return newOrder; 
};

export const updateOrder = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const orderDoc = doc(db, ORDERS_COLLECTION, id);
    // Before updating, ensure no 'undefined' values are in 'updates'
    const sanitizedUpdates: Partial<TrackingLink> = {};
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        const value = updates[key as keyof TrackingLink];
        if (value !== undefined) {
          (sanitizedUpdates as any)[key] = value;
        } else {
          // If you want to remove a field, you'd use Firestore's deleteField()
          // For now, we'll just ensure undefined isn't passed.
          // If the intention was to set to null for "empty", that should be handled before calling updateOrder.
          (sanitizedUpdates as any)[key] = null; // Or omit, depending on desired behavior
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
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    const newComment: Comment = {
      ...commentData,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    const updatedComments = [...order.comments, newComment];
    
    // Ensure the order object passed to updateOrder is clean
    const orderToUpdate = { ...order, comments: updatedComments };
    // Remove any potential undefined top-level fields from orderToUpdate before passing to updateOrder
    // This is a bit defensive, as updateOrder now also sanitizes.
    Object.keys(orderToUpdate).forEach(key => {
      if (orderToUpdate[key as keyof TrackingLink] === undefined) {
        delete orderToUpdate[key as keyof TrackingLink];
      }
    });
    
    await updateOrder(orderId, { comments: updatedComments });
    return { ...orderToUpdate, comments: updatedComments };

  } catch (error) {
    console.error(`Error adding comment to order ${orderId}:`, error);
    return undefined;
  }
};

export const getOrderCount = async (): Promise<number> => {
    const ordersCol = collection(db, ORDERS_COLLECTION);
    const snapshot = await getCountFromServer(ordersCol);
    return snapshot.data().count;
};
