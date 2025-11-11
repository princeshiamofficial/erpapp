

"use server";

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, query, orderBy, writeBatch, getDoc as getFirestoreDoc, deleteField } from 'firebase/firestore';
import type { Project, ProjectStatusType, User, OrderLogEntry } from '@/types'; 
import { v4 as uuidv4 } from 'uuid'; 
import { formatISO, addDays } from 'date-fns';
import { getOrders, getOrderById as getOrderByIdFromService } from './order-service'; 
import { ORDER_SUBMITTED_ID, READY_FOR_DESIGN_STATUS_ID } from './status-service'; 
import { getUsers as getAllUsersService } from './user-service'; 
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';


const PROJECTS_COLLECTION = 'projects';

const getInitialStatusTimestampField = (status: ProjectStatusType): keyof Project | undefined => {
  switch (status) {
    case 'CR Clearance': return 'crClearanceAt';
    case 'CO Clearance': return 'coClearanceAt';
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
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export const getProjects = async (): Promise<Project[]> => {
  console.log('[getProjects] Function called. Generating projects from orders.');
  
  let ordersToDisplayAsProjects: Project[] = [];
  try {
    const [allOrders, allUsers] = await Promise.all([
      getOrders(),
      getAllUsersService() 
    ]);
    const userMap = new Map(allUsers.map(user => [user.id, user]));

    ordersToDisplayAsProjects = allOrders
      .map(order => {
        const projectCreatedAt = order.createdAt || formatISO(new Date());
        const projectEndDate = formatISO(addDays(new Date(projectCreatedAt), 2)); 
        const crmUser = userMap.get(order.crmUserId);
        const drUser = order.designerRepresentativeId ? userMap.get(order.designerRepresentativeId) : undefined;

        let projectStatus: ProjectStatusType;
        let crClearanceTimestamp: string | undefined = undefined;
        let onDesignTimestamp: string | undefined = undefined;
        
        if (order.currentStatus === 'cancelled') projectStatus = 'Cancel';
        else if (order.currentStatus === 'delivered') projectStatus = 'Delivered';
        else if (order.currentStatus === 'shipped') projectStatus = 'Courier';
        else if (order.currentStatus === 'on-hold') projectStatus = 'On Hold';
        else if (order.currentStatus === 'logistics') projectStatus = 'Logistics';
        else if (order.currentStatus === 'co-clearance') projectStatus = 'CO Clearance';
        else if (order.currentStatus === 'ready-for-design' || order.currentStatus.toLowerCase().includes('design')) projectStatus = 'On Design';
        else projectStatus = 'CR Clearance';

        const dynamicProject: Project = {
          id: order.id, 
          projectIdDisplay: order.id, name: order.companyName, status: projectStatus,
          assigneeId: order.crmUserId, assigneeName: order.crmUserName,
          assigneeInitials: getInitialsForName(order.crmUserName),
          assigneeAvatarUrl: null,
          designerRepresentativeId: order.designerRepresentativeId || null,
          designerRepresentativeName: order.designerRepresentativeName || null,
          designerRepresentativeAvatarUrl: null,
          categoryTag: 'From Order', createdAt: projectCreatedAt,
          updatedAt: order.updatedAt || projectCreatedAt, endDate: projectEndDate,
          crClearanceAt: crClearanceTimestamp, onDesignAt: onDesignTimestamp,
        };
        return dynamicProject;
      });

  } catch (error) {
    console.error("[getProjects] Error fetching or processing orders for dynamic projects from API:", error);
    // Return empty array on error to prevent site crash
    return [];
  }
  
  // Perform sorting on the client-side after fetching all data
  return ordersToDisplayAsProjects.sort((a, b) => {
    const dateACreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateBCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateBCreated !== dateACreated) return dateBCreated - dateACreated;
    const dateAUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateBUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateBUpdated - dateAUpdated;
  });
};

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  if (!projectId) return null;

  try {
    const persistentProject = await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents/${projectId}`);
    if (persistentProject && persistentProject.data) {
      console.log(`[getProjectById] Found persistent project for ID: ${projectId}`);
      return { id: persistentProject.id, ...persistentProject.data } as Project;
    }
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      console.log(`[getProjectById] No persistent project found for ${projectId}. Falling back to order data.`);
    } else {
      console.error(`[getProjectById] Error fetching persistent project ${projectId}:`, error);
    }
  }

  // Fallback: If no persistent project, try to build one from an order.
  try {
    const order = await getOrderByIdFromService(projectId);
    if (order) {
      console.log(`[getProjectById] Found order for ID ${projectId}. Building dynamic project view.`);
      const projectCreatedAt = order.createdAt || formatISO(new Date());
      const projectEndDate = formatISO(addDays(new Date(projectCreatedAt), 2));
      const crmUser = await getAllUsersService().then(users => users.find(u => u.id === order.crmUserId));

      let projectStatus: ProjectStatusType;
      if (order.currentStatus === 'cancelled') projectStatus = 'Cancel';
      else if (order.currentStatus === 'delivered') projectStatus = 'Delivered';
      else if (order.currentStatus === 'shipped') projectStatus = 'Courier';
      else if (order.currentStatus === 'on-hold') projectStatus = 'On Hold';
      else if (order.currentStatus === 'logistics') projectStatus = 'Logistics';
      else if (order.currentStatus === 'co-clearance') projectStatus = 'CO Clearance';
      else if (order.currentStatus === 'ready-for-design' || order.currentStatus.toLowerCase().includes('design')) projectStatus = 'On Design';
      else projectStatus = 'CR Clearance';

      return {
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
        designerRepresentativeAvatarUrl: null,
        categoryTag: 'From Order',
        createdAt: projectCreatedAt,
        updatedAt: order.updatedAt || projectCreatedAt,
        endDate: projectEndDate,
      };
    }
  } catch (error) {
    console.error(`[getProjectById] Error in fallback to order for ID ${projectId}:`, error);
  }

  console.log(`[getProjectById] No project or order found for ID: ${projectId}`);
  return null;
};



export const updateProjectStatus = async (
  projectId: string, newStatus: ProjectStatusType, projectDataIfCreating?: Project
): Promise<boolean> => {
  const now = formatISO(new Date());

  try {
    const existingProject = await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents/${projectId}`).catch(() => null);

    if (existingProject && existingProject.data) {
      const updates: { [key: string]: any } = { status: newStatus, updatedAt: now };
      const currentStatusTimestampField = getInitialStatusTimestampField(existingProject.data.status);
      if (currentStatusTimestampField) updates[currentStatusTimestampField] = null; // Use null to remove field via API
      const newStatusTimestampField = getInitialStatusTimestampField(newStatus);
      if (newStatusTimestampField) updates[newStatusTimestampField] = now;
      
      const payload = { data: { ...existingProject.data, ...updates }};
      await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents/${projectId}`, {
        method: 'PUT', body: JSON.stringify(payload)
      });
      
    } else if (projectDataIfCreating) {
      const { 
        id: _oldId, status: _oldStatus, updatedAt: _oldUpdatedAt, createdAt: _oldCreatedAt,
        crClearanceAt, coClearanceAt, cancelAt, onDesignAt, onHoldAt, logisticsAt, courierAt, deliveredAt,
        ...restOfProjectData 
      } = projectDataIfCreating;
      
      const newProjectToSet: Partial<Project> = {
        ...restOfProjectData, status: newStatus, createdAt: _oldCreatedAt || now, updatedAt: now,
      };
      
      const newStatusTimestampField = getInitialStatusTimestampField(newStatus);
      if (newStatusTimestampField) (newProjectToSet as any)[newStatusTimestampField] = now;
      
      const payload = { id: projectId, data: newProjectToSet };
      await fetchFromApiV3(`collections/${PROJECTS_COLLECTION}/documents`, {
        method: 'POST', body: JSON.stringify(payload)
      });
    } else {
      throw new Error(`Project document ${projectId} not found and no creation data provided.`);
    }
    return true;
  } catch (error) {
    const specificError = error instanceof Error ? error.message : "Unknown API error";
    console.error(`[updateProjectStatus] Error for project ID ${projectId}:`, specificError, error);
    throw new Error(`Database operation failed for project ${projectId}: ${specificError}`);
  }
};
