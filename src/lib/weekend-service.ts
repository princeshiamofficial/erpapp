
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'weekend';
const WEEKEND_DOC_ID = 'settings';

export interface WeekendSettings {
  days: string[]; // e.g., ["Friday", "Saturday"]
}

export const getWeekendSettings = async (): Promise<WeekendSettings> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${WEEKEND_DOC_ID}`);
    if (response && response.data) {
        return {
            days: response.data.days || ["Friday", "Saturday"] // Default if field is missing
        };
    }
     // If doc doesn't exist, create it with defaults
    const defaultSettings: WeekendSettings = { days: ["Friday", "Saturday"] };
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ id: WEEKEND_DOC_ID, data: defaultSettings }),
    });
    return defaultSettings;

  } catch (error) {
     if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        const defaultSettings: WeekendSettings = { days: ["Friday", "Saturday"] };
        try {
             await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
                method: 'POST',
                body: JSON.stringify({ id: WEEKEND_DOC_ID, data: defaultSettings }),
            });
             return defaultSettings;
        } catch (createError) {
             console.error("Error creating default weekend settings via API v3:", createError);
        }
    }
    console.error("Error fetching weekend settings via API v3:", error);
    return { days: ["Friday", "Saturday"] }; // Fallback default
  }
};

export const saveWeekendSettings = async (days: string[]): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        
        const payload = {
            id: WEEKEND_DOC_ID,
            data: { days }
        };

        const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${WEEKEND_DOC_ID}`).catch(() => null);

        if (existingDoc) {
             await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${WEEKEND_DOC_ID}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        } else {
            await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }
        return true;
    } catch (error) {
        console.error("Error saving weekend settings via API v3:", error);
        return false;
    }
};
