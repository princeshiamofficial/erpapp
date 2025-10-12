'use server';
/**
 * @fileOverview A Genkit tool for searching and retrieving order information.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getOrders } from '@/lib/order-service';

export const orderSearchTool = ai.defineTool(
  {
    name: 'orderSearchTool',
    description: 'Search for orders by ID, company name, or phone number.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The Order ID, company name, or phone number to search for.'),
    }),
    outputSchema: z.object({
      orders: z.array(z.object({
        id: z.string(),
        companyName: z.string(),
        currentStatus: z.string(),
        createdAt: z.string(),
        totalAmount: z.number(),
        dueAmount: z.number(),
      })),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    try {
      const allOrders = await getOrders();
      const searchTerm = input.searchTerm.toLowerCase();
      
      const foundOrders = allOrders.filter(order => 
        order.id.toLowerCase().includes(searchTerm) ||
        order.companyName.toLowerCase().includes(searchTerm) ||
        order.phoneNumber.includes(searchTerm)
      );

      if (foundOrders.length === 0) {
        return { orders: [], error: `No orders found matching "${input.searchTerm}".` };
      }

      // Map to a summary format to return to the model
      const summarizedOrders = foundOrders.slice(0, 5).map(order => {
        const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
        const effectiveDiscount = order.specialClientDiscount || 0;
        const netPayable = orderSubtotal - effectiveDiscount;
        const shippingCharge = order.shippingCharge || 0;
        const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
        const grandTotal = netPayable + shippingCharge;
        const amountDue = grandTotal - totalAdvancePaid;
        
        return {
          id: order.id,
          companyName: order.companyName,
          currentStatus: order.currentStatus,
          createdAt: order.createdAt,
          totalAmount: grandTotal,
          dueAmount: amountDue,
        };
      });

      return { orders: summarizedOrders };

    } catch (error) {
      console.error("Error in orderSearchTool:", error);
      return { orders: [], error: "An error occurred while searching for orders." };
    }
  }
);
