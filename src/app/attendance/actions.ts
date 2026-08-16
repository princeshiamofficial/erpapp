
"use server";

import type { User, AttendanceRecord } from '@/types';
import { addOrUpdateAttendanceRecord } from '@/lib/attendance-service';

// This is a new action to save attendance records.
export async function saveAttendanceAction(
  currentUser: User,
  recordData: Partial<Omit<AttendanceRecord, 'id' | 'employeeId' | 'employeeName'>> & { checkInTime: string }
): Promise<{ success: boolean; error?: string }> {
  if (!currentUser?.id) {
    return { success: false, error: "User not authenticated." };
  }
  if (currentUser?.isBanned) {
    return { success: false, error: "Your account is banned. Attendance access denied." };
  }

  const fullRecordData: Omit<AttendanceRecord, 'id'> = {
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    date: recordData.checkInTime.split('T')[0], // YYYY-MM-DD from ISO string
    checkInTime: recordData.checkInTime,
    status: recordData.status || 'On Time', // Default status
    checkOutTime: recordData.checkOutTime || null,
    hoursWorked: recordData.hoursWorked || null,
    lateReason: recordData.lateReason || null,
    earlyOutReason: recordData.earlyOutReason || null,
    location: recordData.location || 'Unknown',
    checkInLocation: recordData.checkInLocation || undefined,
    checkOutLocation: recordData.checkOutLocation || undefined,
  };

  try {
    const result = await addOrUpdateAttendanceRecord(fullRecordData);
    if (result) {
      return { success: true };
    }
    return { success: false, error: "Failed to save attendance record." };
  } catch (error) {
    console.error("Error in saveAttendanceAction:", error);
    return { success: false, error: "An unexpected server error occurred." };
  }
}
