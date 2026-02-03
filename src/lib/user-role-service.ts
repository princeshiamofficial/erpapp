"use server";

import type { UserRoleDefinition } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const ROLES_COLLECTION = 'userRoles';

const DEFAULT_ROLES: Omit<UserRoleDefinition, 'createdAt' | 'priority'>[] = [
  { id: "SYSTEM_ADMIN", name: "SYSTEM ADMIN", color: "#dc2626", isDefault: true },
  { id: "ADMIN", name: "ADMIN", color: "#9333ea", isDefault: true },
  { id: "CRM", name: "CRM", color: "#f97316", isDefault: true },
  { id: "DESIGNER_REPRESENTATIVE", name: "DESIGNER REPRESENTATIVE", color: "#16a34a", isDefault: true },
  { id: "VENDOR", name: "VENDOR", color: "#6b7280", isDefault: true },
  { id: "LR", name: "LR", color: "#2563eb", isDefault: true },
  { id: "CO", name: "CO", color: "#0891b2", isDefault: true },
];

export const getRoles = async (): Promise<UserRoleDefinition[]> => {
  try {
    await ensureCollectionExistsV3(ROLES_COLLECTION);
    const response = await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents?limit=100`);
    
    let roles: UserRoleDefinition[] = [];

    if (response && Array.isArray(response.documents) && response.documents.length > 0) {
      roles = response.documents.map((doc: any) => ({
        id: doc.id,
        ...doc.data
      } as UserRoleDefinition));
    } else {
      // Seed default roles if none exist
      console.log("No roles found, seeding default roles...");
      for (let i = 0; i < DEFAULT_ROLES.length; i++) {
        const role = DEFAULT_ROLES[i];
        const roleData = { 
          ...role, 
          priority: i,
          createdAt: new Date().toISOString() 
        };
        await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents`, {
          method: 'POST',
          body: JSON.stringify({ id: role.id, data: roleData }),
        });
        roles.push({ id: role.id, ...roleData } as UserRoleDefinition);
      }
    }

    // Sort by priority, then fallback to createdAt
    return roles.sort((a, b) => {
      if (a.priority !== b.priority) return (a.priority || 0) - (b.priority || 0);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  } catch (error) {
    console.error("Error fetching user roles via API v3:", error);
    return DEFAULT_ROLES.map((r, i) => ({ ...r, priority: i, createdAt: new Date().toISOString() } as UserRoleDefinition));
  }
};

export const addCustomRole = async (name: string, color: string): Promise<UserRoleDefinition | null> => {
  if (!name.trim()) return null;
  const id = name.trim().toUpperCase().replace(/\s+/g, '_');
  
  try {
    await ensureCollectionExistsV3(ROLES_COLLECTION);
    const existingRoles = await getRoles();
    const maxPriority = existingRoles.reduce((max, r) => Math.max(max, r.priority || 0), -1);

    const roleData = {
      name: name.trim().toUpperCase(),
      id,
      color: color || "#6b7280",
      isDefault: false,
      priority: maxPriority + 1,
      createdAt: new Date().toISOString(),
    };
    
    const response = await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents`, {
      method: 'POST',
      body: JSON.stringify({ id, data: roleData }),
    });
    
    return { id: response.id, ...response.data } as UserRoleDefinition;
  } catch (error) {
    console.error("Error adding custom role via API v3:", error);
    return null;
  }
};

export const updateCustomRole = async (id: string, name: string, color: string): Promise<boolean> => {
  if (!id || !name.trim()) return false;
  try {
    const existing = await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents/${id}`);
    
    const updatedData = { 
      ...existing.data, 
      name: name.trim().toUpperCase(),
      color: color || existing.data.color || "#6b7280"
    };
    
    await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: updatedData }),
    });
    return true;
  } catch (error) {
    console.error(`Error updating role ${id} via API v3:`, error);
    return false;
  }
};

export const deleteCustomRole = async (id: string): Promise<boolean> => {
  if (!id) return false;
  try {
    const existing = await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents/${id}`);
    if (existing.data.isDefault) return false;

    await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error(`Error deleting role ${id} via API v3:`, error);
    return false;
  }
};

export const updateRolesOrder = async (roleIds: string[]): Promise<boolean> => {
  try {
    for (let i = 0; i < roleIds.length; i++) {
      const id = roleIds[i];
      const existing = await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents/${id}`);
      if (existing && existing.data) {
        const updatedData = { ...existing.data, priority: i };
        await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ data: updatedData }),
        });
      }
    }
    return true;
  } catch (error) {
    console.error("Error updating roles priority order via API v3:", error);
    return false;
  }
};
