
"use server";

import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';

const VOTES_TABLE = 'votes';

export interface VoteData {
    id: string;
    phone_number: string;
    data_json: any;
    created_at: string;
}

export const ensureVotesTable = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS ${VOTES_TABLE} (
                id VARCHAR(255) PRIMARY KEY,
                phone_number VARCHAR(255),
                data_json JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        console.error("Error ensuring votes table exists:", error);
    }
};

export const addVote = async (phoneNumber: string, voteData: any): Promise<boolean> => {
    try {
        await ensureVotesTable();
        const id = uuidv4();
        await query(`INSERT INTO ${VOTES_TABLE} (id, phone_number, data_json) VALUES (?, ?, ?)`,
            [id, phoneNumber, JSON.stringify(voteData)]);
        return true;
    } catch (error) {
        console.error("Error adding vote to MySQL:", error);
        return false;
    }
};

export const getVotesByPhone = async (phoneNumber: string): Promise<VoteData[]> => {
    try {
        await ensureVotesTable();
        const rows = await query<any[]>(`SELECT * FROM ${VOTES_TABLE} WHERE phone_number = ?`, [phoneNumber]);
        return rows.map(row => ({
            id: row.id,
            phone_number: row.phone_number,
            data_json: typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json,
            created_at: row.created_at
        }));
    } catch (error) {
        console.error(`Error fetching votes for phone ${phoneNumber}:`, error);
        return [];
    }
};

export const getAllVotes = async (): Promise<VoteData[]> => {
    try {
        await ensureVotesTable();
        const rows = await query<any[]>(`SELECT * FROM ${VOTES_TABLE} ORDER BY created_at DESC`);
        return rows.map(row => ({
            id: row.id,
            phone_number: row.phone_number,
            data_json: typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json,
            created_at: row.created_at
        }));
    } catch (error) {
        console.error("Error fetching all votes:", error);
        return [];
    }
};
