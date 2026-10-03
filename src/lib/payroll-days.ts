import { getDaysInMonth, isSameMonth, parseISO } from 'date-fns';

export const PAYROLL_BASE_DAYS = 30;

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Weekends are paid off-days; a check-in on a weekend is an extra paid day on top of the 30-day base.
export function calculatePayrollDays(records: { date: string; status?: string }[], weekendDays: string[], month: Date) {
  const weekendIndexes = new Set((weekendDays || []).map(day => WEEK_DAYS.indexOf(day)));

  let workingDays = 0;
  for (let d = 1; d <= getDaysInMonth(month); d++) {
    if (!weekendIndexes.has(new Date(month.getFullYear(), month.getMonth(), d).getDay())) workingDays++;
  }

  const regularDates = new Set<string>();
  const weekendDates = new Set<string>();
  let lateDays = 0;
  for (const record of records) {
    const date = parseISO(record.date);
    if (!isSameMonth(date, month)) continue;
    (weekendIndexes.has(date.getDay()) ? weekendDates : regularDates).add(record.date);
    if (record.status === 'Late') lateDays++;
  }

  const absentDays = Math.max(0, workingDays - regularDates.size);
  return {
    presentDays: Math.max(0, PAYROLL_BASE_DAYS - absentDays),
    extraDays: weekendDates.size,
    absentDays,
    lateDays,
  };
}
