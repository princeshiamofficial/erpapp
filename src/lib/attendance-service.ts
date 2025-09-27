
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { AttendanceRecord } from '@/types';
import { format } from 'date-fns';

const getCollectionNameForDate = (date: Date): string => {
  return `attendance-${format(date, 'yyyy-MM')}`;
};

export const getAttendanceForMonth = async (date: Date): Promise<AttendanceRecord[]> => {
  const collectionName = getCollectionNameForDate(date);
  try {
    await ensureCollectionExistsV3(collectionName);
    const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=9999&orderBy=checkInTime&direction=desc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data,
      } as AttendanceRecord));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching attendance for ${collectionName} via API v3:`, error);
    return [];
  }
};

export const addOrUpdateAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | null> => {
  const checkInDate = new Date(recordData.checkInTime);
  const collectionName = getCollectionNameForDate(checkInDate);
  const documentId = `${recordData.employeeId}_${format(checkInDate, 'yyyy-MM-dd')}`;

  try {
    await ensureCollectionExistsV3(collectionName);
    const existingDoc = await fetchFromApiV3(`collections/${collectionName}/documents/${documentId}`).catch(() => null);

    const payload = { data: { ...(existingDoc?.data || {}), ...recordData } };

    if (existingDoc) {
      await fetchFromApiV3(`collections/${collectionName}/documents/${documentId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
        const createPayload = { id: documentId, data: recordData };
        await fetchFromApiV3(`collections/${collectionName}/documents`, {
            method: 'POST',
            body: JSON.stringify(createPayload),
        });
    }

    const savedDoc = await fetchFromApiV3(`collections/${collectionName}/documents/${documentId}`);
    return { id: savedDoc.id, ...savedDoc.data } as AttendanceRecord;
  } catch (error) {
    console.error(`Error adding/updating attendance record to ${collectionName} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};
