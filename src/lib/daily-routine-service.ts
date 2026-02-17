"use server";

import type { DailyRoutine } from '@/types';
import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';

const HEADERS_TABLE = 'daily_routine_headers';
const ENTRIES_TABLE = 'daily_routine_entries';

export const getRoutineHeadersForUser = async (userId: string): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${HEADERS_TABLE} WHERE user_id = ?`, [userId]);
    return rows.map(row => {
      const parsed = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      return { ...parsed, id: row.id } as DailyRoutine;
    }).sort((a, b) => {
      const timeA = a.time?.split(' ')[0] || '';
      const timeB = b.time?.split(' ')[0] || '';
      return timeA.localeCompare(timeB);
    });
  } catch (error) {
    console.error(`Error fetching routine headers for user ${userId} from MySQL:`, error);
    return [];
  }
};

export const addRoutineHeader = async (routineData: Omit<DailyRoutine, 'id' | 'createdAt' | 'updatedAt' | 'completedTasks'>): Promise<DailyRoutine | null> => {
  if (!routineData.userId || !routineData.title) return null;
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const dataWithTimestamp: DailyRoutine = {
      ...routineData,
      id,
      createdAt: now,
      updatedAt: now,
    } as DailyRoutine;

    await query(`INSERT INTO ${HEADERS_TABLE} (id, user_id, data_json) VALUES (?, ?, ?)`,
      [id, routineData.userId, JSON.stringify(dataWithTimestamp)]);

    return dataWithTimestamp;
  } catch (error) {
    console.error(`Error adding routine header to MySQL:`, error);
    return null;
  }
};

export const updateRoutineHeader = async (id: string, updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>>, userId: string): Promise<boolean> => {
  if (!id || !userId) return false;
  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${HEADERS_TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return false;

    const currentData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const finalData = { ...currentData, ...updates, updatedAt: new Date().toISOString() };

    await query(`UPDATE ${HEADERS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return true;
  } catch (error) {
    console.error(`Error updating routine header ${id} in MySQL:`, error);
    return false;
  }
};

export const deleteRoutineHeader = async (id: string, userId: string): Promise<boolean> => {
  if (!id || !userId) return false;
  try {
    await query(`DELETE FROM ${HEADERS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting routine header ${id} from MySQL:`, error);
    return false;
  }
};

export const getRoutinesForUser = async (userId: string): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${ENTRIES_TABLE} WHERE user_id = ?`, [userId]);
    return rows.map(row => {
      const parsed = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      return { ...parsed, id: row.id } as DailyRoutine;
    });
  } catch (error) {
    console.error(`Error fetching routine entries for user ${userId} from MySQL:`, error);
    return [];
  }
};

export const getRoutineById = async (routineId: string, userId: string): Promise<DailyRoutine | null> => {
  if (!routineId || !userId) return null;
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${ENTRIES_TABLE} WHERE id = ? AND user_id = ?`, [routineId, userId]);
    if (rows.length > 0) {
      const parsed = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
      return { ...parsed, id: rows[0].id } as DailyRoutine;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching routine ${routineId} from MySQL:`, error);
    return null;
  }
};

export const toggleRoutineTask = async (userId: string, date: string, taskId: string): Promise<DailyRoutine | null> => {
  if (!userId || !date || !taskId) {
    console.error('toggleRoutineTask: Missing parameters', { userId, date, taskId });
    return null;
  }
  try {
    let existingDoc = await getRoutineById(date, userId);
    let updatedTasks: Record<string, string>;

    if (!existingDoc) {
      updatedTasks = { [taskId]: new Date().toISOString() };
      const newRoutine: DailyRoutine = {
        id: date,
        userId,
        completedTasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      } as DailyRoutine;

      console.log(`toggleRoutineTask: Inserting new routine for user ${userId} on date ${date}`);
      await query(`INSERT INTO ${ENTRIES_TABLE} (id, user_id, data_json) VALUES (?, ?, ?)`,
        [date, userId, JSON.stringify(newRoutine)]);
      return newRoutine;
    } else {
      const currentTasks = existingDoc.completedTasks || {};
      if (currentTasks[taskId]) {
        const { [taskId]: _, ...remainingTasks } = currentTasks;
        updatedTasks = remainingTasks;
      } else {
        updatedTasks = { ...currentTasks, [taskId]: new Date().toISOString() };
      }

      const updates = {
        completedTasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      const finalData = { ...existingDoc, ...updates };
      console.log(`toggleRoutineTask: Updating routine for user ${userId} on date ${date}`);
      const result = await query<any>(`UPDATE ${ENTRIES_TABLE} SET data_json = ? WHERE id = ? AND user_id = ?`,
        [JSON.stringify(finalData), date, userId]);

      return finalData as DailyRoutine;
    }
  } catch (error) {
    console.error(`Error toggling routine task in MySQL:`, error);
    return null;
  }
};
