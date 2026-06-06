"use server";

import { query } from './mysql';
import type { Project, ProjectStatusType, User, OrderLogEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, addDays, format, parseISO } from 'date-fns';
import { getOrders, getOrderById as getOrderByIdFromService } from './order-service';
import { ORDER_SUBMITTED_ID, READY_FOR_DESIGN_STATUS_ID } from './status-constants';
import { getUsers as getAllUsersService } from './user-service';

const PROJECTS_TABLE = 'projects';

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
    const [allOrders, _allUsers, persistentProjects] = await Promise.all([
      getOrders(),
      getAllUsersService(),
      query<any[]>(`SELECT id, data_json FROM ${PROJECTS_TABLE}`)
    ]);

    const projectsMap = new Map(persistentProjects.map(p => [
      p.id, 
      typeof p.data_json === 'string' ? JSON.parse(p.data_json) : p.data_json
    ]));

    ordersToDisplayAsProjects = allOrders
      .map(order => {
        const projectCreatedAt = order.createdAt || formatISO(new Date());
        const projectEndDate = order.acceptedDeliveryDate || null;

        let projectStatus: ProjectStatusType;
        if (order.currentStatus === 'cancelled') projectStatus = 'Cancel';
        else if (order.currentStatus === 'delivered') projectStatus = 'Delivered';
        else if (order.currentStatus === 'shipped') projectStatus = 'Courier';
        else if (order.currentStatus === 'on-hold') projectStatus = 'On Hold';
        else if (order.currentStatus === 'logistics') projectStatus = 'Logistics';
        else if (order.currentStatus === 'co-clearance') projectStatus = 'CO Clearance';
        else if (order.currentStatus === 'ready-for-design' || order.currentStatus.toLowerCase().includes('design')) projectStatus = 'On Design';
        else projectStatus = 'CR Clearance';

        const persistentData = projectsMap.get(order.id) || {};

        const dynamicProject: Project = {
          ...persistentData,
          id: order.id,
          projectIdDisplay: order.id, 
          name: order.companyName, 
          status: projectStatus,
          assigneeId: order.crmUserId, 
          assigneeName: order.crmUserName,
          assigneeInitials: getInitialsForName(order.crmUserName),
          assigneeAvatarUrl: null,
          designerRepresentativeId: order.designerRepresentativeId || null,
          designerRepresentativeName: order.designerRepresentativeName || null,
          designerRepresentativeAvatarUrl: null,
          categoryTag: 'From Order', 
          createdAt: projectCreatedAt,
          updatedAt: order.updatedAt || projectCreatedAt, 
          endDate: projectEndDate,
        };
        return dynamicProject;
      });

  } catch (error) {
    console.error("[getProjects] Error fetching or processing orders for dynamic projects from MySQL:", error);
    return [];
  }

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
    const results = await query<any[]>(`SELECT data_json FROM ${PROJECTS_TABLE} WHERE id = ?`, [projectId]);
    if (results.length > 0) {
      console.log(`[getProjectById] Found persistent project for ID: ${projectId} in MySQL`);
      const data = typeof results[0].data_json === 'string' ? JSON.parse(results[0].data_json) : results[0].data_json;
      return { id: projectId, ...data } as Project;
    }
  } catch (error) {
    console.error(`[getProjectById] Error fetching persistent project ${projectId} from MySQL:`, error);
  }

  // Fallback: If no persistent project, try to build one from an order.
  try {
    const order = await getOrderByIdFromService(projectId);
    if (order) {
      console.log(`[getProjectById] Found order for ID ${projectId}. Building dynamic project view.`);
      const projectCreatedAt = order.createdAt || formatISO(new Date());
      const projectEndDate = order.acceptedDeliveryDate || null;
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
    const results = await query<any[]>(`SELECT data_json FROM ${PROJECTS_TABLE} WHERE id = ?`, [projectId]);

    if (results.length > 0) {
      const currentData = typeof results[0].data_json === 'string' ? JSON.parse(results[0].data_json) : results[0].data_json;
      const updates: { [key: string]: any } = { status: newStatus, updatedAt: now };

      const currentStatusTimestampField = getInitialStatusTimestampField(currentData.status);
      if (currentStatusTimestampField) updates[currentStatusTimestampField] = null;

      const newStatusTimestampField = getInitialStatusTimestampField(newStatus);
      if (newStatusTimestampField) updates[newStatusTimestampField] = now;

      const finalData = { ...currentData, ...updates };
      await query(`UPDATE ${PROJECTS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), projectId]);
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

      await query(
        `INSERT INTO ${PROJECTS_TABLE} (id, data_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
        [projectId, JSON.stringify(newProjectToSet)]
      );
    } else {
      throw new Error(`Project document ${projectId} not found and no creation data provided.`);
    }
    return true;
  } catch (error) {
    console.error(`[updateProjectStatus] Error for project ID ${projectId} in MySQL:`, error);
    return false;
  }
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<boolean> => {
  try {
    const results = await query<any[]>(`SELECT data_json FROM ${PROJECTS_TABLE} WHERE id = ?`, [projectId]);
    if (results.length === 0) return false;

    const currentData = typeof results[0].data_json === 'string' ? JSON.parse(results[0].data_json) : results[0].data_json;
    const finalData = { ...currentData, ...updates, updatedAt: formatISO(new Date()) };

    await query(`UPDATE ${PROJECTS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), projectId]);
    return true;
  } catch (error) {
    console.error(`[updateProject] Error updating project ${projectId} in MySQL:`, error);
    return false;
  }
};
