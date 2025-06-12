

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, orderBy, writeBatch, getDoc as getFirestoreDoc, deleteField } from 'firebase/firestore'; // Added deleteField
import type { Project, ProjectStatusType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, addMonths, addDays } from 'date-fns';
import { getOrders } from './order-service'; 
import { ORDER_SUBMITTED_ID } from './status-service'; 

const PROJECTS_COLLECTION = 'projects';

const defaultProjectsData: Array<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'crClearanceAt' | 'onDesignAt' | 'onHoldAt' | 'logisticsAt' | 'courierAt' | 'crCancelAt' >> = [
  { projectIdDisplay: 'PJ-001', name: 'Alpha Initiative', status: 'CR Clearance', endDate: formatISO(addMonths(new Date(), 2)), assigneeName: 'Austin Azaria', assigneeInitials: 'AU', categoryTag: 'Corporate Client' },
  { projectIdDisplay: 'PJ-002', name: 'Beta Development', status: 'CR Cancel', endDate: formatISO(addMonths(new Date(), 3)), assigneeName: 'Clerk Kent', assigneeInitials: 'CK', categoryTag: 'Walk-In Customer' },
  { projectIdDisplay: 'PJ-003', name: 'Gamma Graphics', status: 'On Design', endDate: formatISO(addMonths(new Date(), 1)), assigneeName: 'Diana Prince', assigneeInitials: 'DP', categoryTag: 'Internal Project' },
  { projectIdDisplay: 'PJ-004', name: 'Delta Distribution', status: 'Logistics', endDate: formatISO(addMonths(new Date(), 5)), assigneeName: 'Barry Allen', assigneeInitials: 'BA', categoryTag: 'Partner Integration' },
  { projectIdDisplay: 'PJ-005', name: 'Epsilon Exploration', status: 'Courier', endDate: formatISO(addMonths(new Date(), 4)), assigneeName: 'Hal Jordan', assigneeInitials: 'HJ', categoryTag: 'R&D' },
  { projectIdDisplay: 'PJ-006', name: 'Zeta Zero-Day', status: 'On Hold', endDate: formatISO(addMonths(new Date(), 6)), assigneeName: 'Arthur Curry', assigneeInitials: 'AC', categoryTag: 'Security Audit' },
];

const getInitialStatusTimestampField = (status: ProjectStatusType): keyof Project | undefined => {
  switch (status) {
    case 'CR Clearance': return 'crClearanceAt';
    case 'CR Cancel': return 'crCancelAt';
    case 'On Design': return 'onDesignAt';
    case 'On Hold': return 'onHoldAt';
    case 'Logistics': return 'logisticsAt';
    case 'Courier': return 'courierAt';
    default: return undefined;
  }
};

const getInitialsForName = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

export const seedDefaultProjects = async (): Promise<Project[]> => {
  const projectsRef = collection(db, PROJECTS_COLLECTION);
  const batch = writeBatch(db);
  const createdProjects: Project[] = [];
  const now = formatISO(new Date());

  defaultProjectsData.forEach(projectData => {
    const id = uuidv4();
    const newProject: Project = {
      id,
      ...projectData,
      createdAt: now,
      updatedAt: now,
      // Timestamps are initially undefined
    };
    const initialStatusField = getInitialStatusTimestampField(projectData.status);
    if (initialStatusField) {
      (newProject as any)[initialStatusField] = now;
    }

    const docRef = doc(projectsRef, id);
    batch.set(docRef, newProject);
    createdProjects.push(newProject);
  });

  try {
    await batch.commit();
    console.log('Default projects seeded in Firestore with status-specific timestamps.');
    return createdProjects;
  } catch (error) {
    console.error("Error seeding default projects:", error);
    return [];
  }
};

export const getProjects = async (): Promise<Project[]> => {
  console.log('[getProjects] Function called.');
  const projectsCol = collection(db, PROJECTS_COLLECTION);
  const qActualProjects = query(projectsCol, orderBy("createdAt", "desc")); 
  let actualProjects: Project[] = [];

  try {
    const projectSnapshot = await getDocs(qActualProjects);
    if (projectSnapshot.empty) {
      console.log("[getProjects] No actual projects found in Firestore, attempting to seed defaults.");
      actualProjects = await seedDefaultProjects();
    } else {
      actualProjects = projectSnapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Project));
      console.log(`[getProjects] Fetched ${actualProjects.length} actual projects from Firestore.`);
    }
  } catch (error) {
    console.error("[getProjects] Error fetching actual projects:", error);
  }

  const existingProjectIds = new Set(actualProjects.map(p => p.projectIdDisplay));
  console.log('[getProjects] Existing actual project IDs (from projectIdDisplay):', Array.from(existingProjectIds));

  let ordersToDisplayAsProjects: Project[] = [];
  try {
    const allOrders = await getOrders(); 
    console.log(`[getProjects] Fetched ${allOrders.length} total orders.`);
    
    const orderSubmittedOrders = allOrders.filter(
      (order) => order.currentStatus === ORDER_SUBMITTED_ID
    );
    console.log(`[getProjects] Found ${orderSubmittedOrders.length} orders with status '${ORDER_SUBMITTED_ID}'.`);
    
    if (orderSubmittedOrders.length > 0) {
        console.log('[getProjects] Details of "order-submitted" orders:', orderSubmittedOrders.map(o => ({id: o.id, companyName: o.companyName, currentStatus: o.currentStatus, createdAt: o.createdAt })));
    }

    const dynamicProjectsFromOrders = orderSubmittedOrders
      .filter(order => {
        const alreadyExistsAsProject = existingProjectIds.has(order.id);
        if (alreadyExistsAsProject) {
          console.log(`[getProjects] Order ${order.id} already exists as a project, skipping dynamic creation.`);
        }
        return !alreadyExistsAsProject;
      })
      .map(order => {
        const projectCreatedAt = order.createdAt || formatISO(new Date());
        const projectEndDate = formatISO(addDays(new Date(projectCreatedAt), 2)); 

        const dynamicProject: Project = {
          id: order.id, 
          projectIdDisplay: order.id,
          name: order.companyName,
          status: 'CR Clearance',
          assigneeName: order.crmUserName,
          assigneeInitials: getInitialsForName(order.crmUserName),
          categoryTag: 'From Order',
          createdAt: projectCreatedAt,
          updatedAt: order.updatedAt || projectCreatedAt,
          crClearanceAt: projectCreatedAt, 
          endDate: projectEndDate,
        };
        console.log(`[getProjects] Dynamically creating project for order ${order.id}:`, dynamicProject);
        return dynamicProject;
      });

    ordersToDisplayAsProjects = dynamicProjectsFromOrders;
    console.log(`[getProjects] ${ordersToDisplayAsProjects.length} dynamic projects created from orders after filtering duplicates.`);

  } catch (error) {
    console.error("[getProjects] Error fetching or processing orders for dynamic projects:", error);
  }
  
  const combinedProjects = [...actualProjects, ...ordersToDisplayAsProjects];
  console.log(`[getProjects] Total projects before final sort: ${combinedProjects.length}`);
  
  return combinedProjects.sort((a, b) => {
    const dateACreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateBCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (dateBCreated !== dateACreated) {
      return dateBCreated - dateACreated;
    }

    const dateAUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateBUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateBUpdated - dateAUpdated;
  });
};

export const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'crClearanceAt' | 'onDesignAt' | 'onHoldAt' | 'logisticsAt' | 'courierAt' | 'crCancelAt'>): Promise<Project | null> => {
  try {
    const id = uuidv4(); 
    const now = formatISO(new Date());
    const newProject: Project = {
      id, 
      ...projectData, 
      createdAt: now,
      updatedAt: now,
    };
    const initialStatusField = getInitialStatusTimestampField(projectData.status);
    if (initialStatusField) {
      (newProject as any)[initialStatusField] = now;
    }
    await setDoc(doc(db, PROJECTS_COLLECTION, id), newProject);
    console.log(`[addProject] Successfully added project: ${newProject.projectIdDisplay}, Doc ID: ${id}`);
    return newProject;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Unknown Firestore error during addProject";
    console.error("[addProject] Error adding project:", specificError, error);
    throw new Error(`Firestore operation failed during addProject: ${specificError}`);
  }
};

export const updateProjectStatus = async (
  projectId: string, 
  newStatus: ProjectStatusType,
  projectDataIfCreating?: Project 
): Promise<boolean> => {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  const now = formatISO(new Date());

  try {
    const docSnap = await getFirestoreDoc(projectDocRef);

    if (docSnap.exists()) {
      const updates: { [key: string]: any } = {
        status: newStatus,
        updatedAt: now,
      };
      const currentStatus = docSnap.data().status as ProjectStatusType;
      const currentStatusTimestampField = getInitialStatusTimestampField(currentStatus);
      
      // Delete the old status timestamp field only if it's different from the new one and exists
      if (currentStatusTimestampField && currentStatusTimestampField !== getInitialStatusTimestampField(newStatus)) {
        updates[currentStatusTimestampField] = deleteField();
      }
      
      const newStatusTimestampField = getInitialStatusTimestampField(newStatus);
      if (newStatusTimestampField) {
        updates[newStatusTimestampField] = now;
      }
      await updateDoc(projectDocRef, updates);
      console.log(`[updateProjectStatus] Successfully updated project doc ID ${projectId} to status ${newStatus}`);
    } else if (projectDataIfCreating) {
      console.log(`[updateProjectStatus] Project doc ID ${projectId} not found. Creating new project from dragged data.`);
      const { 
        id: _oldId, 
        status: _oldStatus, 
        updatedAt: _oldUpdatedAt, 
        createdAt: _oldCreatedAt,
        crClearanceAt, crCancelAt, onDesignAt, onHoldAt, logisticsAt, courierAt, 
        ...restOfProjectData 
      } = projectDataIfCreating;

      const newProjectToSet: Partial<Project> = {
        id: projectId, // Use the doc ID (which is the order.id for dynamic projects)
        ...restOfProjectData, // Contains projectIdDisplay, name, endDate, etc.
        status: newStatus,
        createdAt: _oldCreatedAt || now, // Preserve original creation if available
        updatedAt: now,
      };
      
      // Set the specific timestamp for the new status
      const newStatusTimestampField = getInitialStatusTimestampField(newStatus);
      if (newStatusTimestampField) {
        (newProjectToSet as any)[newStatusTimestampField] = now;
      }
      
      await setDoc(projectDocRef, newProjectToSet);
      console.log(`[updateProjectStatus] Successfully created new project for doc ID ${projectId} with status ${newStatus}`);
    } else {
      const msg = `Project document ${projectId} not found and no creation data provided. Cannot update status.`;
      console.error(`[updateProjectStatus] ${msg}`);
      throw new Error(msg);
    }
    return true;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Unknown Firestore operation error";
    console.error(`[updateProjectStatus] Error for project ID ${projectId}:`, specificError, error);
    throw new Error(`Database operation failed for project ${projectId}: ${specificError}`);
  }
};
    

