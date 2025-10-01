

"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { AttendanceRecord, User, AttendanceStatus } from '@/types';
import { format, isToday, parseISO } from 'date-fns';

const getCollectionNameForDate = (date: Date): string => {
  return `attendance-${format(date, 'yyyy-MM')}`;
};

const MARK_COLLECTION_NAME = 'attendance-mark';

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


export const getAttendanceMark = async (userId: string): Promise<{ status: 'Checked In' | 'Checked Out', lastCheckInTime: string | null, lastCheckOutTime: string | null, attendanceStatus: AttendanceStatus, checkInLocation?: { lat: number; lng: number; } } | null> => {
    if (!userId) return null;
    try {
        await ensureCollectionExistsV3(MARK_COLLECTION_NAME);
        const doc = await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents/${userId}`);
        // Check if the mark is from today
        if (doc && doc.data && doc.data.date && isToday(parseISO(doc.data.date))) {
            return doc.data;
        }
        return null; // Return null if not found or not for today
    } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            return null; // Document doesn't exist, which is a valid state
        }
        console.error(`Error fetching attendance mark for user ${userId}:`, error);
        return null;
    }
};

export const setAttendanceMark = async (userId: string, data: any): Promise<boolean> => {
    if (!userId) return false;
    try {
        await ensureCollectionExistsV3(MARK_COLLECTION_NAME);
        const doc = await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents/${userId}`).catch(() => null);
        
        const payload = {
            id: userId,
            data: { ...data, date: new Date().toISOString() }
        };

        if (doc) {
             await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        } else {
             await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }
        return true;
    } catch (error) {
        console.error(`Error setting attendance mark for user ${userId}:`, error);
        return false;
    }
};

export const saveAttendanceAction = async (
  currentUser: User,
  recordData: Partial<Omit<AttendanceRecord, 'id' | 'employeeId' | 'employeeName'>> & { checkInTime: string }
): Promise<{ success: boolean; error?: string }> => {
  if (!currentUser?.id) {
    return { success: false, error: "User not authenticated." };
  }

  const fullRecordData: Omit<AttendanceRecord, 'id'> = {
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    date: recordData.checkInTime.split('T')[0],
    checkInTime: recordData.checkInTime,
    status: recordData.status || 'On Time',
    checkOutTime: recordData.checkOutTime || null,
    hoursWorked: recordData.hoursWorked || null,
    lateReason: recordData.lateReason || null,
    earlyOutReason: recordData.earlyOutReason || null,
    location: recordData.location || 'Unknown',
    checkInLocation: recordData.checkInLocation,
    checkOutLocation: recordData.checkOutLocation,
  };

  try {
    // Save historical record
    const historyResult = await addOrUpdateAttendanceRecord(fullRecordData);
    if (!historyResult) {
      return { success: false, error: "Failed to save historical attendance record." };
    }

    // Save current day mark
    const markData = {
        status: recordData.checkOutTime ? 'Checked Out' : 'Checked In',
        lastCheckInTime: recordData.checkInTime,
        lastCheckOutTime: recordData.checkOutTime || null,
        attendanceStatus: recordData.status || 'On Time', // Persist the status
        checkInLocation: recordData.checkInLocation,
    };
    const markResult = await setAttendanceMark(currentUser.id, markData);
    if (!markResult) {
       console.warn(`[saveAttendanceAction] Historical record saved, but failed to save current day mark for user ${currentUser.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in saveAttendanceAction:", error);
    return { success: false, error: "An unexpected server error occurred." };
  }
};
