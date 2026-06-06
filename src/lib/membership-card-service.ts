"use server";

import type { Gift as Card, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { query } from './mysql';

const TABLE_NAME = 'membership_cards';

let isTableInitialized = false;

export const initMembershipCardsTable = async () => {
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
    console.error("Error creating membership_cards table:", error);
  }
};

export const getGifts = async (): Promise<Card[]> => {
  try {
    await initMembershipCardsTable();
    const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME}`);
    const cards = rows.map(row => ({
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as Card));

    // Sort by createdAt DESC to show latest data on top
    return cards.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching membership cards from MySQL:", error);
    return [];
  }
};

export const getGiftById = async (id: string): Promise<Card | null> => {
  if (!id) return null;
  try {
    await initMembershipCardsTable();
    const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (rows.length > 0) {
      return { ...(typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json) } as Card;
    }
  } catch (error) {
    console.error(`Error fetching membership card by ID ${id} from MySQL:`, error);
  }
  return null;
};

export const addGift = async (cardData: Omit<Card, 'id' | 'giftIdDisplay' | 'createdAt' | 'updatedAt' | 'giftItemName' | 'givenByUserId' | 'givenByUserName'> & { giftItemNames: string[] }, currentUser: User): Promise<Card | null> => {
  try {
    await initMembershipCardsTable();
    const allCards = await getGifts();

    const proposedCardNo = cardData.giftItemNames.join(', ').trim();
    const isDuplicate = allCards.some(card => card.giftItemName && card.giftItemName.trim() === proposedCardNo);
    if (isDuplicate) {
      throw new Error(`Card number "${proposedCardNo}" already exists. Duplicates are not allowed.`);
    }

    const currentYear = new Date().getFullYear();
    const prefix = `C${currentYear}0`; // Membership card prefix e.g., C2026001
    let maxId = 0;
    allCards.forEach(card => {
      if (card.giftIdDisplay && card.giftIdDisplay.startsWith(prefix)) {
        const numPart = parseInt(card.giftIdDisplay.substring(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart;
        }
      }
    });
    const newSequence = maxId + 1;
    const giftIdDisplay = `${prefix}${String(newSequence).padStart(2, '0')}`;

    const now = new Date().toISOString();
    const newCardData: Card = {
      ...(cardData as any),
      id: uuidv4(),
      giftIdDisplay,
      givenByUserId: currentUser.id,
      givenByUserName: currentUser.name,
      createdAt: now,
      updatedAt: now,
      giftItemName: proposedCardNo,
    };

    await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [newCardData.id, JSON.stringify(newCardData)]);

    return newCardData;
  } catch (error) {
    console.error("Error adding membership card to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateGift = async (id: string, updates: Partial<Omit<Card, 'id' | 'createdAt'>>, currentUser: User): Promise<Card | null> => {
  try {
    await initMembershipCardsTable();
    const existingCard = await getGiftById(id);
    if (!existingCard) throw new Error(`Membership card with ID ${id} not found.`);

    const finalUpdates = { ...updates };
    if (updates.giftItemNames) {
      const proposedCardNo = updates.giftItemNames.join(', ').trim();
      const allCards = await getGifts();
      const isDuplicate = allCards.some(card => card.id !== id && card.giftItemName && card.giftItemName.trim() === proposedCardNo);
      if (isDuplicate) {
        throw new Error(`Card number "${proposedCardNo}" already exists. Duplicates are not allowed.`);
      }
      finalUpdates.giftItemName = proposedCardNo;
    }

    const finalData = {
      ...existingCard,
      ...finalUpdates,
      updatedAt: new Date().toISOString(),
    };

    await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return finalData;
  } catch (error) {
    console.error(`Error updating membership card ${id} in MySQL:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const deleteGift = async (id: string): Promise<boolean> => {
  try {
    await initMembershipCardsTable();
    await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting membership card ${id} from MySQL:`, error);
    return false;
  }
};
