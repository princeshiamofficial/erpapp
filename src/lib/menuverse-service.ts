"use server";

import { query } from './mysql';

const MENUVERSE_REGISTRATIONS_TABLE = 'menuverse_registrations';

export const initMenuverseTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ${MENUVERSE_REGISTRATIONS_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        whatsapp_number VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        restaurant_name VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL,
        restaurant_type VARCHAR(100),
        number_of_branches INT,
        ip_address VARCHAR(45),
        comment TEXT,
        status VARCHAR(50) DEFAULT 'New Request',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Attempt to add the column for existing tables seamlessly
    try {
      await query(`ALTER TABLE ${MENUVERSE_REGISTRATIONS_TABLE} ADD COLUMN ip_address VARCHAR(45)`);
    } catch (e) {}
    try {
      await query(`ALTER TABLE ${MENUVERSE_REGISTRATIONS_TABLE} ADD COLUMN comment TEXT`);
    } catch (e) {}
    try {
      await query(`ALTER TABLE ${MENUVERSE_REGISTRATIONS_TABLE} ADD COLUMN status VARCHAR(50) DEFAULT 'New Request'`);
    } catch (e) {}
    try {
      await query(`UPDATE ${MENUVERSE_REGISTRATIONS_TABLE} SET status = 'New Request' WHERE status = 'Active'`);
    } catch (e) {}
  } catch (error) {
    console.error("Error creating menuverse_registrations table:", error);
  }
};

export type MenuverseRegistration = {
  fullName: string;
  whatsappNumber: string;
  email: string;
  restaurantName: string;
  role: string;
  restaurantType?: string;
  address: string;
  numberOfTables: number;
  numberOfBranches?: number;
  ipAddress?: string;
  comment?: string;
  status?: string;
};

export const createMenuverseRegistration = async (data: MenuverseRegistration) => {
  try {
    await initMenuverseTable();

    if (data.ipAddress) {
      const existing = await query<any[]>(`SELECT id FROM ${MENUVERSE_REGISTRATIONS_TABLE} WHERE ip_address = ? LIMIT 1`, [data.ipAddress]);
      if (existing.length > 0) {
        return { success: false, error: "Already submitted from this IP address" };
      }
    }

    await query(`
      INSERT INTO ${MENUVERSE_REGISTRATIONS_TABLE} (
        full_name, whatsapp_number, email, restaurant_name, role, restaurant_type, address, number_of_tables, number_of_branches, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.fullName,
      data.whatsappNumber,
      data.email,
      data.restaurantName,
      data.role,
      data.restaurantType || null,
      data.address,
      data.numberOfTables,
      data.numberOfBranches || null,
      data.ipAddress || null,
    ]);
    return { success: true };
  } catch (error) {
    console.error("Error saving menuverse registration:", error);
    return { success: false, error: "Failed to save registration" };
  }
};

export const getMenuverseRegistrations = async (): Promise<(MenuverseRegistration & { id: number, created_at: Date })[]> => {
  try {
    await initMenuverseTable();
    const rows = await query<any[]>(`SELECT * FROM ${MENUVERSE_REGISTRATIONS_TABLE} ORDER BY created_at DESC`);
    return rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      whatsappNumber: row.whatsapp_number,
      email: row.email,
      restaurantName: row.restaurant_name,
      role: row.role,
      restaurantType: row.restaurant_type,
      address: row.address,
      numberOfTables: row.number_of_tables,
      numberOfBranches: row.number_of_branches,
      ipAddress: row.ip_address,
      comment: row.comment,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error("Error fetching menuverse registrations:", error);
    return [];
  }
};

export const addMenuverseComment = async (id: number, text: string, userId: string) => {
  try {
    const existing = await query<any[]>(`SELECT comment FROM ${MENUVERSE_REGISTRATIONS_TABLE} WHERE id = ? LIMIT 1`, [id]);
    let history: any[] = [];
    
    if (existing.length > 0 && existing[0].comment) {
      try {
        history = JSON.parse(existing[0].comment);
        if (!Array.isArray(history)) {
          // Fallback if the previous comment was just a plain string
          history = [{ text: existing[0].comment, createdAt: new Date().toISOString(), userId: "system" }];
        }
      } catch (e) {
        // Fallback if parsing fails (legacy plain text)
        history = [{ text: existing[0].comment, createdAt: new Date().toISOString(), userId: "system" }];
      }
    }
    
    history.push({ text, createdAt: new Date().toISOString(), userId });
    
    await query(`UPDATE ${MENUVERSE_REGISTRATIONS_TABLE} SET comment = ? WHERE id = ?`, [JSON.stringify(history), id]);
    return { success: true, history };
  } catch (error) {
    console.error("Error adding menuverse comment:", error);
    return { success: false, error: "Failed to add comment" };
  }
};

export const deleteMenuverseComment = async (id: number, index: number) => {
  try {
    const existing = await query<any[]>(`SELECT comment FROM ${MENUVERSE_REGISTRATIONS_TABLE} WHERE id = ? LIMIT 1`, [id]);
    if (existing.length === 0 || !existing[0].comment) {
      return { success: false, error: "No comments found" };
    }
    
    let history: any[] = JSON.parse(existing[0].comment);
    if (!Array.isArray(history) || index < 0 || index >= history.length) {
      return { success: false, error: "Invalid comment index" };
    }
    
    history.splice(index, 1);
    
    await query(`UPDATE ${MENUVERSE_REGISTRATIONS_TABLE} SET comment = ? WHERE id = ?`, [JSON.stringify(history), id]);
    return { success: true, history };
  } catch (error) {
    console.error("Error deleting menuverse comment:", error);
    return { success: false, error: "Failed to delete comment" };
  }
};

export const deleteMenuverseRegistration = async (id: number) => {
  try {
    await query(`DELETE FROM ${MENUVERSE_REGISTRATIONS_TABLE} WHERE id = ?`, [id]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting menuverse registration:", error);
    return { success: false, error: "Failed to delete registration" };
  }
};

export const updateMenuverseStatus = async (id: number, status: string) => {
  try {
    await query(`UPDATE ${MENUVERSE_REGISTRATIONS_TABLE} SET status = ? WHERE id = ?`, [status, id]);
    return { success: true };
  } catch (error) {
    console.error("Error updating menuverse status:", error);
    return { success: false, error: "Failed to update status" };
  }
};
