
"use server";

import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';
import type { StockActivity, User } from '@/types';
import { getUsers } from './user-service';

const TABLE_NAME = 'stock_activities';

let isTableInitialized = false;

export const initStockActivityTable = async () => {
    if (isTableInitialized) return;
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                id VARCHAR(36) PRIMARY KEY,
                data_json JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        isTableInitialized = true;
    } catch (error) {
        console.error("Error creating stock_activities table:", error);
    }
};

export const logStockActivity = async (
    type: StockActivity['type'],
    productName: string,
    userName: string,
    userId: string,
    details?: string,
    quantity?: number,
    productId?: string
) => {
    try {
        await initStockActivityTable();
        const id = uuidv4();
        const activity: StockActivity = {
            id,
            type,
            productName,
            productId,
            quantity,
            userName,
            userId,
            timestamp: new Date().toISOString(),
            details
        };

        await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(activity)]);
        return activity;
    } catch (error) {
        console.error("Error logging stock activity:", error);
        return null;
    }
};

export const getStockActivities = async (limit: number = 20): Promise<(StockActivity & { userAvatar?: string | null })[]> => {
    try {
        await initStockActivityTable();
        const [rows, users] = await Promise.all([
            query<any[]>(`SELECT data_json FROM ${TABLE_NAME} ORDER BY created_at DESC LIMIT ?`, [limit]),
            getUsers()
        ]);

        const userMap = new Map(users.map(u => [u.id, u]));

        return rows.map(row => {
            const data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
            const activity = data as StockActivity;
            const user = userMap.get(activity.userId);
            return {
                ...activity,
                userName: user?.name || activity.userName,
                userAvatar: user?.avatarUrl || null
            };
        });
    } catch (error) {
        console.error("Error fetching stock activities:", error);
        return [];
    }
};
