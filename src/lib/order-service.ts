
import { db } from './firebase';
import { collection, getDocs, doc, addDoc, updateDoc, getDoc, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { TrackingLink, Comment, OrderLogEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatuses } from './status-service'; // To get default status IDs

const ORDERS_COLLECTION = 'orders';

// Helper to seed initial orders if the collection is empty
const seedInitialOrders = async (): Promise<TrackingLink[]> => {
  const statuses = await getStatuses(); // Ensure statuses are loaded/seeded
  const ideaSubmittedStatus = statuses.find(s => s.name === 'Idea Submitted');
  const inProductionStatus = statuses.find(s => s.name === 'In Production');
  const pendingApprovalStatus = statuses.find(s => s.name === 'Pending Client Approval');
  const shippedStatus = statuses.find(s => s.name === 'Shipped');
  const readyForDesignStatus = statuses.find(s => s.name === 'Ready for Design');

  if (!ideaSubmittedStatus || !inProductionStatus || !pendingApprovalStatus || !shippedStatus || !readyForDesignStatus) {
    console.error("Default statuses not found, cannot seed initial orders properly.");
    return [];
  }
  
  const initialOrdersData: Omit<TrackingLink, 'id' | 'createdAt'>[] = [
    {
      customerName: "Tech Solutions Inc.",
      companyName: "Tech Solutions Inc.",
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101",
      service: "Custom Software Development",
      crmUserId: "user-crm-001", // Corresponds to Bob CRM
      crmUserName: "Bob CRM",
      isPublic: true,
      currentStatus: inProductionStatus.id,
      statusHistory: [
        { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: ideaSubmittedStatus.id, changedByUserId: "user-crm-001", changedByUserName: "Bob CRM", notes: "Order created, requirements gathered." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: inProductionStatus.id, changedByUserId: "user-crm-001", changedByUserName: "Bob CRM", notes: "Production has commenced." }
      ],
      comments: [
        { id: uuidv4(), userName: "Tech Solutions Inc. (Client)", text: "Looking forward to the first demo!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), isInternal: false }
      ],
    },
    {
      customerName: "GreenScape Ltd.",
      companyName: "GreenScape Ltd.",
      address: "456 Green Rd, Meadowville, TX 75001",
      phoneNumber: "555-0102",
      service: "Landscaping Design Package",
      crmUserId: "user-crm-002", // Corresponds to David CRM
      crmUserName: "David CRM",
      isPublic: false,
      currentStatus: pendingApprovalStatus.id,
      statusHistory: [
        { id: uuidv4(), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: ideaSubmittedStatus.id, changedByUserId: "user-crm-002", changedByUserName: "David CRM", notes: "New landscaping project initiated." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: readyForDesignStatus.id, changedByUserId: "user-crm-002", changedByUserName: "David CRM", notes: "Order ready for design team." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: pendingApprovalStatus.id, changedByUserId: "user-dr-001", changedByUserName: "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
      ],
      comments: [],
      designerRepresentativeId: "user-dr-001",
      designerRepresentativeName: "Carol DesignerRep",
    },
  ];

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const createdOrders: TrackingLink[] = [];

  for (const orderData of initialOrdersData) {
    const newOrder: TrackingLink = {
      ...orderData,
      id: `ORD-${uuidv4().slice(0,8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    // Convert string dates in statusHistory and comments to Firestore Timestamps if needed by your setup
    // For simplicity, we store as ISO strings for now. Firestore can handle these.
    const docRef = doc(ordersRef, newOrder.id);
    await addDoc(ordersRef, newOrder); // Using addDoc for simplicity, Firestore generates ID which we are overriding with our own 'id' field.
    // For custom IDs:
    // const docRef = doc(db, ORDERS_COLLECTION, newOrder.id);
    // await setDoc(docRef, newOrder);
    createdOrders.push(newOrder);
  }
  console.log('Initial orders seeded in Firestore.');
  return createdOrders;
};


export const getOrders = async (): Promise<TrackingLink[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  // Optionally order by creation date or other fields
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log('No orders found in Firestore, seeding initial orders.');
    return await seedInitialOrders();
  }
  
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as TrackingLink));
};

export const getOrderById = async (id: string): Promise<TrackingLink | undefined> => {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TrackingLink;
    }
    console.warn(`Order with ID "${id}" not found.`);
    return undefined;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return undefined;
  }
};

export const addOrder = async (orderData: Omit<TrackingLink, 'id' | 'createdAt' | 'statusHistory' | 'comments'> & { initialStatusId: string, crmUserId: string, crmUserName: string }): Promise<TrackingLink> => {
  const now = new Date().toISOString();
  const initialLogEntry: OrderLogEntry = {
    id: uuidv4(),
    timestamp: now,
    status: orderData.initialStatusId,
    changedByUserId: orderData.crmUserId,
    changedByUserName: orderData.crmUserName,
    notes: "Order created.",
  };

  const newOrder: TrackingLink = {
    ...orderData,
    id: `ORD-${uuidv4().slice(0,8).toUpperCase()}`,
    createdAt: now,
    statusHistory: [initialLogEntry],
    comments: [],
    isPublic: false, // Default to non-public
    currentStatus: orderData.initialStatusId,
  };

  // Use the custom ID 'newOrder.id' for the document ID
  const orderDocRef = doc(db, ORDERS_COLLECTION, newOrder.id);
  await addDoc(collection(db, ORDERS_COLLECTION), newOrder); // addDoc will create an auto-ID, we want to use newOrder.id
  // Corrected: Use setDoc with our custom ID.
  // await setDoc(orderDocRef, newOrder); // This would use our custom ID `newOrder.id`
  // For this refactor, let's allow Firestore to generate ID and our `id` field is just a property.
  const addedDocRef = await addDoc(collection(db, ORDERS_COLLECTION), newOrder);
  return { ...newOrder, id: addedDocRef.id }; // Return the order with Firestore's generated ID
};

export const updateOrder = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const orderDoc = doc(db, ORDERS_COLLECTION, id);
    await updateDoc(orderDoc, updates);
    return true;
  } catch (error) {
    console.error(`Error updating order ${id}:`, error);
    return false;
  }
};

export const addCommentToOrder = async (orderId: string, comment: Omit<Comment, 'id' | 'timestamp'>): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    const newComment: Comment = {
      ...comment,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    const updatedComments = [...order.comments, newComment];
    await updateOrder(orderId, { comments: updatedComments });
    return { ...order, comments: updatedComments };
  } catch (error) {
    console.error(`Error adding comment to order ${orderId}:`, error);
    return undefined;
  }
};
