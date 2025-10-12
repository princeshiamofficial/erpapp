
'use server';
/**
 * @fileOverview A Genkit tool for generating a salary sheet for a specific month.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getEmployees } from '@/lib/employee-service';
import { getSalarySheetForMonth } from '@/app/(app)/payroll/actions';
import { format, parse, isValid } from 'date-fns';

export const salarySheetTool = ai.defineTool(
  {
    name: 'salarySheetTool',
    description: 'Generates a salary sheet for all employees for a given month and year. Use this for queries like "generate the salary sheet for June 2024".',
    inputSchema: z.object({
      monthYear: z.string().describe('The month and year for the report in "Month YYYY" format, e.g., "June 2024".'),
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
        const parsedDate = parse(input.monthYear, 'MMMM yyyy', new Date());
        if (!isValid(parsedDate)) {
            throw new Error('Invalid date format. Please use "Month YYYY", e.g., "June 2024".');
        }
        const monthStr = format(parsedDate, 'yyyy-MM');
        
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
            month: format(parsedDate, 'MMMM yyyy'),
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
