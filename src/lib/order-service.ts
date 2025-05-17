
import { db } from './firebase';
import { collection, getDocs, doc, addDoc, updateDoc, getDoc, query, orderBy, setDoc } from 'firebase/firestore';
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
  const shippedStatus = statuses.find(s => s.name === 'Shipped');
  const readyForDesignStatus = statuses.find(s => s.name === 'Ready for Design');

  if (!ideaSubmittedStatus || !inProductionStatus || !pendingApprovalStatus || !shippedStatus || !readyForDesignStatus) {
    console.error("Default statuses not found, cannot seed initial orders properly.");
    return [];
  }
  
  const initialOrdersData: Omit<TrackingLink, 'id' | 'createdAt' | 'statusHistory' | 'comments' | 'currentStatus'>[] = [
    {
      customerName: "Tech Solutions Inc.",
      companyName: "Tech Solutions Inc.",
      address: "123 Tech Ave, Silicon Valley, CA 94001",
      phoneNumber: "555-0101",
      service: "Custom Software Development",
      crmUserId: "user-admin-default", 
      crmUserName: "Default Admin", // Assuming an admin created this for demo
      isPublic: true,
      designerRepresentativeId: undefined,
      designerRepresentativeName: undefined,
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
      designerRepresentativeId: "user-dr-001", // Mock DR ID
      designerRepresentativeName: "Carol DesignerRep", // Mock DR Name
    },
  ];

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const createdOrders: TrackingLink[] = [];
  let orderIndex = 0;

  for (const orderBaseData of initialOrdersData) {
    let currentStatusId: string;
    let statusHistory: OrderLogEntry[];

    if (orderIndex === 0) { // For Tech Solutions Inc.
      currentStatusId = inProductionStatus.id;
      statusHistory = [
        { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: ideaSubmittedStatus.id, changedByUserId: orderBaseData.crmUserId, changedByUserName: orderBaseData.crmUserName, notes: "Order created, requirements gathered." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: inProductionStatus.id, changedByUserId: orderBaseData.crmUserId, changedByUserName: orderBaseData.crmUserName, notes: "Production has commenced." }
      ];
    } else { // For GreenScape Ltd.
      currentStatusId = pendingApprovalStatus.id;
      statusHistory = [
        { id: uuidv4(), timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: ideaSubmittedStatus.id, changedByUserId: orderBaseData.crmUserId, changedByUserName: orderBaseData.crmUserName, notes: "New landscaping project initiated." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: readyForDesignStatus.id, changedByUserId: orderBaseData.crmUserId, changedByUserName: orderBaseData.crmUserName, notes: "Order ready for design team." },
        { id: uuidv4(), timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: pendingApprovalStatus.id, changedByUserId: orderBaseData.designerRepresentativeId || "user-dr-001", changedByUserName: orderBaseData.designerRepresentativeName || "Carol DesignerRep", notes: "Initial designs submitted for client approval." }
      ];
    }

    const newOrder: TrackingLink = {
      ...orderBaseData,
      id: `ORD-${uuidv4().slice(0,8).toUpperCase()}`, // Generate a unique ID for the order
      createdAt: new Date(Date.now() - (initialOrdersData.length - orderIndex) * 24 * 60 * 60 * 1000).toISOString(), // Stagger creation times
      currentStatus: currentStatusId,
      statusHistory: statusHistory,
      comments: orderIndex === 0 ? [
        { id: uuidv4(), userName: "Tech Solutions Inc. (Client)", text: "Looking forward to the first demo!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), isInternal: false }
      ] : [],
    };
    
    const docRef = doc(ordersRef, newOrder.id); // Use our custom ID for the document
    await setDoc(docRef, newOrder);
    createdOrders.push(newOrder);
    orderIndex++;
  }
  console.log('Initial orders seeded in Firestore.');
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
  const orderId = `ORD-${uuidv4().slice(0,8).toUpperCase()}`;

  const initialLogEntry: OrderLogEntry = {
    id: uuidv4(),
    timestamp: now,
    status: orderData.initialStatusId, // This is already an ID
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
    service: orderData.service,
    crmUserId: orderData.crmUserId,
    crmUserName: orderData.crmUserName,
    createdAt: now,
    statusHistory: [initialLogEntry],
    comments: [],
    isPublic: false, 
    currentStatus: orderData.initialStatusId, 
    designerRepresentativeId: undefined,
    designerRepresentativeName: undefined,
  };

  const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
  await setDoc(orderDocRef, newOrder);
  return newOrder; 
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
    await updateOrder(orderId, { comments: updatedComments });
    return { ...order, comments: updatedComments };
  } catch (error) {
    console.error(`Error adding comment to order ${orderId}:`, error);
    return undefined;
  }
};
