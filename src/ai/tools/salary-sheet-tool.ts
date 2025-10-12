
'use server';
/**
 * @fileOverview A Genkit tool for generating a salary sheet for a specific month.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getEmployees } from '@/lib/employee-service';
import { getSalarySheetForMonth } from '@/app/(app)/payroll/actions';
import { format, parse, isValid, startOfMonth, subMonths } from 'date-fns';

const MonthEnum = z.enum(['thisMonth', 'lastMonth']);

export const salarySheetTool = ai.defineTool(
  {
    name: 'salarySheetTool',
    description: 'Generates a salary sheet for all employees for a given month. Use this for queries like "generate the salary sheet for this month" or "show me last month\'s salary sheet".',
    inputSchema: z.object({
      month: MonthEnum.describe('The month for the report, e.g., "thisMonth" or "lastMonth".'),
    }),
    outputSchema: z.object({
      month: z.string(),
      report: z.array(z.object({
        employeeName: z.string(),
        designation: z.string(),
        baseSalary: z.number(),
        presentDays: z.number(),
        absentDays: z.number(),
        lateDays: z.number(),
        fine: z.number(),
        providentFund: z.number(),
        incentive: z.number(),
        payableAmount: z.number(),
        paymentStatus: z.string(),
      })),
      totals: z.object({
          totalPayable: z.number(),
          totalFine: z.number(),
          totalProvidentFund: z.number(),
      })
    }),
  },
  async (input) => {
    try {
        const now = new Date();
        let targetDate: Date;

        switch(input.month) {
            case 'thisMonth':
                targetDate = startOfMonth(now);
                break;
            case 'lastMonth':
                targetDate = startOfMonth(subMonths(now, 1));
                break;
            default:
                throw new Error('Invalid month specified for salary sheet.');
        }

        const monthStr = format(targetDate, 'yyyy-MM');
        
        const [allEmployees, salarySheet] = await Promise.all([
            getEmployees(),
            getSalarySheetForMonth(monthStr),
        ]);

        let totalPayable = 0;
        let totalFine = 0;
        let totalProvidentFund = 0;

        const report = allEmployees
            .filter(emp => emp.status === 'Active')
            .map(employee => {
                const payslip = salarySheet.find(p => p.employeeId === employee.employeeId);
                const baseSalary = employee.salary || 0;
                
                let reportItem;
                if (payslip) {
                    reportItem = {
                        employeeName: employee.name,
                        designation: employee.designation,
                        baseSalary,
                        presentDays: payslip.presentDays,
                        absentDays: payslip.absentDays,
                        lateDays: payslip.lateDays,
                        fine: payslip.fine,
                        providentFund: baseSalary * 0.07,
                        incentive: payslip.incentive,
                        payableAmount: payslip.payableAmount,
                        paymentStatus: payslip.paymentStatus,
                    };
                } else {
                    // Default calculation if no payslip is stored
                    const providentFund = baseSalary * 0.07;
                    reportItem = {
                        employeeName: employee.name,
                        designation: employee.designation,
                        baseSalary,
                        presentDays: 30, // Default assumption
                        absentDays: 0,
                        lateDays: 0,
                        fine: 0,
                        providentFund,
                        incentive: 0,
                        payableAmount: baseSalary - providentFund,
                        paymentStatus: 'Unpaid',
                    };
                }
                
                totalPayable += reportItem.payableAmount;
                totalFine += reportItem.fine;
                totalProvidentFund += reportItem.providentFund;

                return reportItem;
        });

        return {
            month: format(targetDate, 'MMMM yyyy'),
            report,
            totals: {
                totalPayable,
                totalFine,
                totalProvidentFund,
            }
        };

    } catch (error) {
      console.error("Error in salarySheetTool:", error);
      throw new Error("An error occurred while generating the salary sheet.");
    }
  }
);
