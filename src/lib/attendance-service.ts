

"use server";

import { query } from './mysql';
import type { AttendanceRecord, User, AttendanceStatus } from '@/types';
import { format, isToday, parseISO } from 'date-fns';

const ATTENDANCE_TABLE = 'attendance_records';
const MARK_TABLE = 'attendance_marks';

export const getAttendanceForMonth = async (date: Date): Promise<AttendanceRecord[]> => {
  const monthStart = format(date, 'yyyy-MM-01');
  const nextMonth = new Date(date);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = format(nextMonth, 'yyyy-MM-01');

  try {
    const results = await query<any[]>(
      `SELECT * FROM ${ATTENDANCE_TABLE} WHERE date >= ? AND date < ? ORDER BY check_in_time DESC`,
      [monthStart, monthEnd]
    );

    return results.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      date: row.date.toISOString().split('T')[0],
      checkInTime: row.check_in_time.toISOString(),
      checkOutTime: row.check_out_time ? row.check_out_time.toISOString() : null,
      status: row.status,
      hoursWorked: row.hours_worked,
      lateReason: row.late_reason,
      earlyOutReason: row.early_out_reason,
      location: row.location,
      checkInLocation: row.check_in_location,
      checkOutLocation: row.check_out_location,
    } as AttendanceRecord));
  } catch (error) {
    console.error(`Error fetching attendance from MySQL:`, error);
    return [];
  }
};

export const addOrUpdateAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | null> => {
  const checkInDate = new Date(recordData.checkInTime);
  const documentId = `${recordData.employeeId}_${format(checkInDate, 'yyyy-MM-dd')}`;

  try {
    const checkInTime = format(parseISO(recordData.checkInTime), 'yyyy-MM-dd HH:mm:ss');
    const checkOutTime = recordData.checkOutTime ? format(parseISO(recordData.checkOutTime), 'yyyy-MM-dd HH:mm:ss') : null;
    const date = recordData.date; // already YYYY-MM-DD

    await query(
      `INSERT INTO ${ATTENDANCE_TABLE} (id, employee_id, employee_name, date, check_in_time, check_out_time, status, hours_worked, late_reason, early_out_reason, location, check_in_location, check_out_location) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       employee_name = VALUES(employee_name), 
       check_in_time = VALUES(check_in_time), 
       check_out_time = VALUES(check_out_time), 
       status = VALUES(status), 
       hours_worked = VALUES(hours_worked), 
       late_reason = VALUES(late_reason), 
       early_out_reason = VALUES(early_out_reason), 
       location = VALUES(location), 
       check_in_location = VALUES(check_in_location), 
       check_out_location = VALUES(check_out_location)`,
      [
        documentId, recordData.employeeId, recordData.employeeName, date, checkInTime, checkOutTime,
        recordData.status, recordData.hoursWorked, recordData.lateReason, recordData.earlyOutReason,
        recordData.location, JSON.stringify(recordData.checkInLocation || null), JSON.stringify(recordData.checkOutLocation || null)
      ]
    );

    return { id: documentId, ...recordData } as AttendanceRecord;
  } catch (error) {
    console.error(`Error adding/updating attendance record in MySQL:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const getAttendanceMark = async (userId: string): Promise<{ status: 'Checked In' | 'Checked Out', lastCheckInTime: string | null, lastCheckOutTime: string | null, attendanceStatus: AttendanceStatus, checkInLocation?: { lat: number; lng: number; } } | null> => {
  if (!userId) return null;
  try {
    const results = await query<any[]>(`SELECT * FROM ${MARK_TABLE} WHERE user_id = ?`, [userId]);
    if (results.length > 0) {
      const row = results[0];
      // Check if the mark is from today
      if (row.date && isToday(row.date)) {
        return {
          status: row.status,
          lastCheckInTime: row.last_check_in_time ? row.last_check_in_time.toISOString() : null,
          lastCheckOutTime: row.last_check_out_time ? row.last_check_out_time.toISOString() : null,
          attendanceStatus: row.attendance_status,
          checkInLocation: row.check_in_location,
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching attendance mark from MySQL for user ${userId}:`, error);
    return null;
  }
};

export const setAttendanceMark = async (userId: string, data: any): Promise<boolean> => {
  if (!userId) return false;
  try {
    const checkInTime = data.lastCheckInTime ? format(parseISO(data.lastCheckInTime), 'yyyy-MM-dd HH:mm:ss') : null;
    const checkOutTime = data.lastCheckOutTime ? format(parseISO(data.lastCheckOutTime), 'yyyy-MM-dd HH:mm:ss') : null;
    const date = format(new Date(), 'yyyy-MM-dd');

    await query(
      `INSERT INTO ${MARK_TABLE} (user_id, status, last_check_in_time, last_check_out_time, attendance_status, check_in_location, date) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             status = VALUES(status), 
             last_check_in_time = VALUES(last_check_in_time), 
             last_check_out_time = VALUES(last_check_out_time), 
             attendance_status = VALUES(attendance_status), 
             check_in_location = VALUES(check_in_location), 
             date = VALUES(date)`,
      [
        userId, data.status, checkInTime, checkOutTime,
        data.attendanceStatus, JSON.stringify(data.checkInLocation || null), date
      ]
    );
    return true;
  } catch (error) {
    console.error(`Error setting attendance mark in MySQL for user ${userId}:`, error);
    return false;
  }
};

export const saveAttendanceAction = async (
  currentUser: User,
  recordData: Partial<Omit<AttendanceRecord, 'id' | 'employeeId' | 'employeeName'>>
): Promise<{ success: boolean; error?: string }> => {
  if (!currentUser?.id) {
    return { success: false, error: "User not authenticated." };
  }

  if (!recordData.checkInTime) {
    return { success: false, error: "Check-in time is missing." };
  }

  const fullRecordData: Omit<AttendanceRecord, 'id'> = {
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    date: recordData.date || recordData.checkInTime.split('T')[0],
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
      attendanceStatus: recordData.status || 'On Time',
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
