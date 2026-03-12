"use server";

import type { UserRoleDefinition } from '@/types';
import { query } from './mysql';

const ROLES_TABLE = 'user_roles';

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
    const results = await query<any[]>(`SELECT * FROM ${ROLES_TABLE} ORDER BY priority ASC, created_at ASC`);

    if (results.length > 0) {
      return results.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        isDefault: Boolean(row.is_default),
        priority: row.priority,
        createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString() : new Date().toISOString(),
      } as UserRoleDefinition));
    } else {
      // Seed default roles
      console.log("No roles found in MySQL, seeding defaults...");
      const roles: UserRoleDefinition[] = [];
      for (let i = 0; i < DEFAULT_ROLES.length; i++) {
        const role = DEFAULT_ROLES[i];
        const createdAt = new Date().toISOString();
        await query(
          `INSERT INTO ${ROLES_TABLE} (id, name, color, is_default, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [role.id, role.name, role.color, role.isDefault, i, createdAt]
        );
        roles.push({ ...role, priority: i, createdAt } as UserRoleDefinition);
      }
      return roles;
    }
  } catch (error) {
    console.error("Error fetching user roles from MySQL:", error);
    return DEFAULT_ROLES.map((r, i) => ({ ...r, priority: i, createdAt: new Date().toISOString() } as UserRoleDefinition));
  }
};

export const addCustomRole = async (name: string, color: string): Promise<UserRoleDefinition | null> => {
  if (!name.trim()) return null;
  const id = name.trim().toUpperCase().replace(/\s+/g, '_');

  try {
    const existingRoles = await getRoles();
    const maxPriority = existingRoles.reduce((max, r) => Math.max(max, r.priority || 0), -1);

    const createdAt = new Date().toISOString();
    const roleData = {
      id,
      name: name.trim().toUpperCase(),
      color: color || "#6b7280",
      isDefault: false,
      priority: maxPriority + 1,
      createdAt
    };

    await query(
      `INSERT INTO ${ROLES_TABLE} (id, name, color, is_default, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [roleData.id, roleData.name, roleData.color, roleData.isDefault, roleData.priority, roleData.createdAt]
    );

    return roleData as UserRoleDefinition;
  } catch (error) {
    console.error("Error adding custom role to MySQL:", error);
    return null;
  }
};

export const updateCustomRole = async (id: string, name: string, color: string): Promise<boolean> => {
  if (!id || !name.trim()) return false;
  try {
    await query(
      `UPDATE ${ROLES_TABLE} SET name = ?, color = ? WHERE id = ?`,
      [name.trim().toUpperCase(), color || "#6b7280", id]
    );
    return true;
  } catch (error) {
    console.error(`Error updating role ${id} in MySQL:`, error);
    return false;
  }
};

export const deleteCustomRole = async (id: string): Promise<boolean> => {
  if (!id) return false;
  try {
    // Prevent deleting default roles
    const results = await query<any[]>(`SELECT is_default FROM ${ROLES_TABLE} WHERE id = ?`, [id]);
    if (results.length > 0 && results[0].is_default) return false;

    await query(`DELETE FROM ${ROLES_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting role ${id} from MySQL:`, error);
    return false;
  }
};

export const updateRolesOrder = async (roleIds: string[]): Promise<boolean> => {
  try {
    for (let i = 0; i < roleIds.length; i++) {
      await query(`UPDATE ${ROLES_TABLE} SET priority = ? WHERE id = ?`, [i, roleIds[i]]);
    }
    return true;
  } catch (error) {
    console.error("Error updating roles priority order in MySQL:", error);
    return false;
  }
};
