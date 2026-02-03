
"use server";

import type { UserRoleDefinition } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const ROLES_COLLECTION = 'userRoles';

const DEFAULT_ROLES: Omit<UserRoleDefinition, 'createdAt'>[] = [
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
    const response = await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents?limit=100&orderBy=createdAt&direction=asc`);
    
    if (response && Array.isArray(response.documents) && response.documents.length > 0) {
      return response.documents.map((doc: any) => ({
        id: doc.id,
        ...doc.data
      } as UserRoleDefinition));
    }

    // Seed default roles if none exist
    console.log("No roles found, seeding default roles...");
    const seededRoles: UserRoleDefinition[] = [];
    for (const role of DEFAULT_ROLES) {
      const roleData = { ...role, createdAt: new Date().toISOString() };
      await fetchFromApiV3(`collections/${ROLES_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ id: role.id, data: roleData }),
      });
      seededRoles.push({ id: role.id, ...roleData } as UserRoleDefinition);
    }
    return seededRoles;
  } catch (error) {
    console.error("Error fetching user roles via API v3:", error);
    return DEFAULT_ROLES.map(r => ({ ...r, createdAt: new Date().toISOString() } as UserRoleDefinition));
  }
};

export const addCustomRole = async (name: string, color: string): Promise<UserRoleDefinition | null> => {
  if (!name.trim()) return null;
  const id = name.trim().toUpperCase().replace(/\s+/g, '_');
  
  try {
    await ensureCollectionExistsV3(ROLES_COLLECTION);
    const roleData = {
      name: name.trim().toUpperCase(),
      id,
      color: color || "#6b7280",
      isDefault: false,
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
    
    // Only block name update for default roles if we strictly want to protect IDs/System functionality
    // but color should always be editable by system admin
    
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
