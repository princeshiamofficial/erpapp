

"use server";

import { getOrderById } from '@/lib/order-service';
import type { TrackingLink } from '@/types';

export async function getFullOrdersByIds(orderIds: string[]): Promise<TrackingLink[]> {
    if (!orderIds || orderIds.length === 0) {
        return [];
    }
    try {
        const orderPromises = orderIds.map(id => getOrderById(id));
        const orders = await Promise.all(orderPromises);
        return orders.filter((order): order is TrackingLink => order !== undefined);
    } catch (error) {
        console.error("Error fetching multiple orders by ID:", error);
        return [];
    }
}

export async function getPackzyDeliveryStatusAction(trackingCode: string): Promise<{ delivery_status: string } | { error: string }> {
  if (!trackingCode) {
    return { error: 'Tracking code is required.' };
  }

  const apiKey = 'vfei2q49dhy1rxqxjs6xntkkvc2odeax';
  const secretKey = 'n4wr4fhdohq0x3gmm8xg3pp1';

  try {
    const response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${trackingCode}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    const data = await response.json();

    if (data.status !== 200) {
      console.error('Steadfast API Error:', data);
      return { error: data.message || 'Failed to fetch delivery status from Steadfast.' };
    }

    return { delivery_status: data.delivery_status };
  } catch (error) {
    console.error('Error calling Steadfast API:', error);
    return { error: 'An unexpected error occurred while fetching delivery status.' };
  }
}
