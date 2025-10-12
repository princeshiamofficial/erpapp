
'use server';
/**
 * @fileOverview A Genkit tool for generating sales and order reports.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getOrders } from '@/lib/order-service';
import { isWithinInterval, subDays, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';

const DateRangeEnum = z.enum(['today', 'yesterday', 'last7days', 'last30days', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear']);

export const salesReportTool = ai.defineTool(
  {
    name: 'salesReportTool',
    description: 'Generates a sales and order report for a given date range. Use this for queries like "show me today\'s sales" or "how many orders last week?".',
    inputSchema: z.object({
      dateRange: DateRangeEnum.describe('The predefined date range for the report.'),
    }),
    outputSchema: z.object({
      dateRange: z.string(),
      totalSales: z.number(),
      totalOrders: z.number(),
      averageOrderValue: z.number(),
      topSellingProducts: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        totalSales: z.number(),
      })),
    }),
  },
  async (input) => {
    try {
      const allOrders = await getOrders();
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date = endOfToday();

      switch(input.dateRange) {
        case 'today':
          startDate = startOfToday();
          endDate = endOfToday();
          break;
        case 'yesterday':
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case 'last7days':
          startDate = subDays(now, 6);
          break;
        case 'last30days':
          startDate = subDays(now, 29);
          break;
        case 'thisWeek':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'lastWeek':
          startDate = startOfWeek(subDays(now, 7));
          endDate = endOfWeek(subDays(now, 7));
          break;
        case 'thisMonth':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'lastMonth':
          startDate = startOfMonth(subDays(now, 30));
          endDate = endOfMonth(subDays(now, 30));
          break;
        case 'thisYear':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        case 'lastYear':
          startDate = startOfYear(subDays(now, 365));
          endDate = endOfYear(subDays(now, 365));
          break;
        default:
            throw new Error('Invalid date range');
      }

      const ordersInRange = allOrders.filter(order => {
        try {
            const orderDate = new Date(order.createdAt);
            return isWithinInterval(orderDate, { start: startDate, end: endDate });
        } catch {
            return false;
        }
      });
      
      let totalSales = 0;
      const productSales: Record<string, { quantity: number, totalSales: number }> = {};

      ordersInRange.forEach(order => {
        order.orderItems.forEach(item => {
          const itemTotal = item.lineItemTotalPrice || 0;
          totalSales += itemTotal;
          if (!productSales[item.model]) {
            productSales[item.model] = { quantity: 0, totalSales: 0 };
          }
          productSales[item.model].quantity += item.quantity;
          productSales[item.model].totalSales += itemTotal;
        });
      });

      const totalOrders = ordersInRange.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      const topSellingProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5);

      return {
        dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalSales,
        totalOrders,
        averageOrderValue,
        topSellingProducts,
      };

    } catch (error) {
      console.error("Error in salesReportTool:", error);
      // It's better to return a structured error that the LLM can understand.
      throw new Error("An error occurred while generating the sales report.");
    }
  }
);
