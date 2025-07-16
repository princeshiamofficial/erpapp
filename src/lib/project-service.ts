

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, orderBy, writeBatch, getDoc as getFirestoreDoc, deleteField } from 'firebase/firestore';
import type { Project, ProjectStatusType, User, OrderLogEntry } from '@/types'; // Added User, OrderLogEntry
import { v4 as uuidv4 } from 'uuid'; // Added
import { formatISO, addDays } from 'date-fns';
import { getOrders } from './order-service'; 
import { ORDER_SUBMITTED_ID, READY_FOR_DESIGN_STATUS_ID } from './status-service'; 
import { getUsers as getAllUsersService } from './user-service'; // Import user service to fetch avatars

const PROJECTS_COLLECTION = 'projects';


const getInitialStatusTimestampField = (status: ProjectStatusType): keyof Project | undefined => {
  switch (status) {
    case 'CR Clearance': return 'crClearanceAt';
    case 'Cancel': return 'cancelAt';
    case 'On Design': return 'onDesignAt';
    case 'On Hold': return 'onHoldAt';
    case 'Logistics': return 'logisticsAt';
    case 'Courier': return 'courierAt';
    case 'Delivered': return 'deliveredAt';
    default: return undefined;
  }
};

const getInitialsForName = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};


export const getProjects = async (): Promise<Project[]> => {
  console.log('[getProjects] Function called.');
  const projectsCol = collection(db, PROJECTS_COLLECTION);
  const qActualProjects = query(projectsCol, orderBy("createdAt", "desc")); 
  let actualProjects: Project[] = [];

  try {
    const projectSnapshot = await getDocs(qActualProjects);
    if (projectSnapshot.empty) {
      console.log("[getProjects] No actual projects found in Firestore.");
      actualProjects = [];
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
    const [allOrders, allUsers] = await Promise.all([
      getOrders(),
      getAllUsersService() 
    ]);
    const userMap = new Map(allUsers.map(user => [user.id, user]));

    console.log(`[getProjects] Fetched ${allOrders.length} total orders.`);
    
    const relevantOrdersForKanban = allOrders.filter(
      (order) => order.currentStatus === ORDER_SUBMITTED_ID || order.currentStatus === READY_FOR_DESIGN_STATUS_ID
    );
    console.log(`[getProjects] Found ${relevantOrdersForKanban.length} orders with status '${ORDER_SUBMITTED_ID}' or '${READY_FOR_DESIGN_STATUS_ID}'.`);
    
    const dynamicProjectsFromOrders = relevantOrdersForKanban
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
        const crmUser = userMap.get(order.crmUserId);
        const drUser = order.designerRepresentativeId ? userMap.get(order.designerRepresentativeId) : undefined;

        let projectStatus: ProjectStatusType;
        let crClearanceTimestamp: string | undefined = undefined;
        let onDesignTimestamp: string | undefined = undefined;

        if (order.currentStatus === ORDER_SUBMITTED_ID) {
          projectStatus = 'CR Clearance';
          crClearanceTimestamp = order.createdAt || projectCreatedAt;
        } else if (order.currentStatus === READY_FOR_DESIGN_STATUS_ID) {
          projectStatus = 'On Design';
          onDesignTimestamp = order.updatedAt || projectCreatedAt; // Assuming updatedAt reflects when it became ready for design
        } else {
          // Fallback, though filter should prevent this
          projectStatus = 'CR Clearance'; 
          crClearanceTimestamp = order.createdAt || projectCreatedAt;
        }

        const dynamicProject: Project = {
          id: order.id, 
          projectIdDisplay: order.id,
          name: order.companyName,
          status: projectStatus,
          assigneeId: order.crmUserId,
          assigneeName: order.crmUserName,
          assigneeInitials: getInitialsForName(order.crmUserName),
          assigneeAvatarUrl: crmUser?.avatarUrl || null,
          designerRepresentativeId: order.designerRepresentativeId || null,
          designerRepresentativeName: order.designerRepresentativeName || null,
          designerRepresentativeAvatarUrl: drUser?.avatarUrl || null,
          categoryTag: 'From Order',
          createdAt: projectCreatedAt,
          updatedAt: order.updatedAt || projectCreatedAt,
          endDate: projectEndDate,
          crClearanceAt: crClearanceTimestamp,
          onDesignAt: onDesignTimestamp,
        };
        console.log(`[getProjects] Dynamically creating project for order ${order.id} with status ${projectStatus}:`, dynamicProject);
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

export const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'crClearanceAt' | 'onDesignAt' | 'onHoldAt' | 'logisticsAt' | 'courierAt' | 'cancelAt' | 'deliveredAt'>): Promise<Project | null> => {
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
        crClearanceAt, cancelAt, onDesignAt, onHoldAt, logisticsAt, courierAt, deliveredAt,
        ...restOfProjectData 
      } = projectDataIfCreating;

      const newProjectToSet: Partial<Project> = {
        id: projectId, 
        ...restOfProjectData, 
        status: newStatus,
        createdAt: _oldCreatedAt || now, 
        updatedAt: now,
      };
      
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
    
