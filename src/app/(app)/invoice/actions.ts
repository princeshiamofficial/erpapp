
"use server";

import { getOrderById } from '@/lib/order-service';
import type { TrackingLink } from '@/types';

// This file can be used for server actions related to the invoice list page.

export async function getFullOrdersByIds(orderIds: string[]): Promise<TrackingLink[]> {
    if (!orderIds || orderIds.length === 0) {
        return [];
    }
    try {
        const orderPromises = orderIds.map(id => getOrderById(id));
        const orders = await Promise.all(orderPromises);
        // Filter out any undefined results in case an order was not found
        return orders.filter((order): order is TrackingLink => order !== undefined);
    } catch (error) {
        console.error("Error fetching multiple orders by ID:", error);
        return [];
    }
}
