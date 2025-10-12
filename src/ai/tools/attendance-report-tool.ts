'use server';
/**
 * @fileOverview A Genkit tool for generating attendance reports.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAttendanceForMonth } from '@/lib/attendance-service';
import { getWeekendSettings } from '@/lib/weekend-service';
import { getUsers } from '@/lib/user-service';
import { 
  isWithinInterval, 
  subDays, 
  startOfToday, 
  endOfToday, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  parseISO,
  differenceInDays,
  isSameDay
} from 'date-fns';

const DateRangeEnum = z.enum(['today', 'yesterday', 'last7days', 'last30days', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']);
const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const attendanceReportTool = ai.defineTool(
  {
    name: 'attendanceReportTool',
    description: 'Generates an attendance report for all employees over a given date range. Use this for queries like "today\'s attendance" or "show me the attendance report for last month".',
    inputSchema: z.object({
      dateRange: DateRangeEnum.describe('The predefined date range for the report.'),
    }),
    outputSchema: z.object({
      dateRange: z.string(),
      totalWorkingDays: z.number(),
      report: z.array(z.object({
        employeeName: z.string(),
        presentDays: z.number(),
        absentDays: z.number(),
        lateDays: z.number(),
      })),
    }),
  },
  async (input) => {
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = endOfToday();

      switch(input.dateRange) {
        case 'today': startDate = startOfToday(); break;
        case 'yesterday': startDate = startOfDay(subDays(now, 1)); endDate = endOfDay(subDays(now, 1)); break;
        case 'last7days': startDate = subDays(now, 6); break;
        case 'last30days': startDate = subDays(now, 29); break;
        case 'thisWeek': startDate = startOfWeek(now); endDate = endOfWeek(now); break;
        case 'lastWeek': startDate = startOfWeek(subDays(now, 7)); endDate = endOfWeek(subDays(now, 7)); break;
        case 'thisMonth': startDate = startOfMonth(now); endDate = endOfMonth(now); break;
        case 'lastMonth': startDate = startOfMonth(subDays(now, 30)); endDate = endOfMonth(subDays(now, 30)); break;
        case 'thisYear': startDate = startOfYear(now); endDate = endOfYear(now); break;
        case 'lastYear': startDate = startOfYear(subDays(now, 365)); endDate = endOfYear(subDays(now, 365)); break;
        default: throw new Error('Invalid date range');
      }
      
      const [allUsers, weekendSettings] = await Promise.all([
          getUsers(),
          getWeekendSettings(),
      ]);

      const monthsToFetch = new Set<string>();
      let tempDate = startOfMonth(startDate);
      while (tempDate <= endOfMonth(endDate)) {
        monthsToFetch.add(format(tempDate, 'yyyy-MM'));
        tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 1);
      }

      const attendancePromises = Array.from(monthsToFetch).map(month => getAttendanceForMonth(parseISO(`${month}-01`)));
      const monthlyRecords = await Promise.all(attendancePromises);
      const allAttendanceRecords = monthlyRecords.flat();

      const attendanceInRange = allAttendanceRecords.filter(record => {
          try {
              const recordDate = parseISO(record.date);
              return isWithinInterval(recordDate, { start: startDate, end: endDate });
          } catch { return false; }
      });
      
      const weekendDayIndexes = (weekendSettings.days || []).map(day => WEEK_DAYS.indexOf(day));
      let totalWorkingDays = 0;
      const numDays = differenceInDays(endDate, startDate) + 1;
      for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        if (!weekendDayIndexes.includes(currentDate.getDay())) {
          totalWorkingDays++;
        }
      }

      const report = allUsers
        .filter(u => u.role !== 'SYSTEM_ADMIN' && u.role !== 'VENDOR')
        .map(user => {
            const userAttendance = attendanceInRange.filter(rec => rec.employeeId === user.id);
            const presentDays = userAttendance.length;
            const lateDays = userAttendance.filter(rec => rec.status === 'Late').length;
            const absentDays = totalWorkingDays - presentDays;
            
            return {
                employeeName: user.name,
                presentDays,
                absentDays: Math.max(0, absentDays), // Ensure non-negative
                lateDays,
            };
        });

      return {
        dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalWorkingDays,
        report,
      };

    } catch (error) {
      console.error("Error in attendanceReportTool:", error);
      throw new Error("An error occurred while generating the attendance report.");
    }
  }
);
