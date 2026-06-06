
"use server";

import { revalidatePath } from "next/cache";
import type { Gift, User } from '@/types';
import {
  getGifts as getGiftsFromDb,
  addGift as addGiftToDb,
  updateGift as updateGiftInDb,
  deleteGift as deleteGiftFromDb,
  getGiftById,
} from '@/lib/gift-service';
import { sendTelegramMessage } from "@/lib/notification-utils";
import { getIO } from "@/lib/socket-io";

const sanitizeForPackzy = (input: string | null | undefined): string => {
  if (!input) return '';
  return input
    .replace(/[^\p{L}\p{M}\p{N}.,\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export async function getGifts(): Promise<Gift[]> {
  try {
    return await getGiftsFromDb();
  } catch (error) {
    console.error("Error in getGifts server action:", error);
    return [];
  }
}

export async function addGiftAction(
  giftData: Omit<Gift, 'id' | 'giftIdDisplay' | 'givenByUserId' | 'givenByUserName' | 'createdAt' | 'updatedAt' | 'giftItemName'> & { giftItemNames: string[] },
  currentUser: User
): Promise<{ success: boolean; gift?: Gift; error?: string }> {
  try {
    const newGift = await addGiftToDb(giftData, currentUser);
    if (newGift) {
      revalidatePath("/(app)/gifts");
      const io = getIO();
      if (io) {
        io.emit("gift-updated", { type: 'create', gift: newGift });
      }
      return { success: true, gift: newGift };
    }
    return { success: false, error: "Failed to add gift to database." };
  } catch (error) {
    console.error("Error in addGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateGiftAction(
  giftId: string,
  updates: Partial<Omit<Gift, 'id' | 'createdAt' | 'giftItemName'>> & { giftItemNames: string[] },
  currentUser: User
): Promise<{ success: boolean; gift?: Gift; error?: string }> {
  try {
    const updatedGift = await updateGiftInDb(giftId, updates, currentUser);
    if (updatedGift) {
      revalidatePath("/(app)/gifts");
      const io = getIO();
      if (io) {
        io.emit("gift-updated", { type: 'update', gift: updatedGift });
      }
      return { success: true, gift: updatedGift };
    }
    return { success: false, error: "Failed to update gift in database." };
  } catch (error) {
    console.error("Error in updateGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteGift(giftId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteGiftFromDb(giftId);
    if (success) {
      revalidatePath("/(app)/gifts");
      const io = getIO();
      if (io) {
        io.emit("gift-updated", { type: 'delete', id: giftId });
      }
      return { success: true };
    }
    return { success: false, error: "Failed to delete gift from database." };
  } catch (error) {
    console.error("Error in deleteGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function transferGiftToCourierAction(
  gift: Gift,
  actingUser: User,
  shippingArea: string,
  shippingCharge: number,
  customRecipientName?: string,
  customRecipientAddress?: string
): Promise<{ success: boolean; error?: string; consignment?: any }> {
  if (!gift || !gift.id) {
    return { success: false, error: 'Invalid gift data provided.' };
  }

  try {
    const existingGift = await getGiftById(gift.id);
    if (!existingGift) {
      return { success: false, error: `Gift with ID ${gift.id} not found.` };
    }

    const numericShippingCharge = Number(shippingCharge) || 0;
    const totalCodAmount = numericShippingCharge; // Gifts usually have 0 product due, only shipping charge if any

    const recipientNameRaw = customRecipientName || existingGift.recipientName;
    const recipientAddressRaw = customRecipientAddress || existingGift.recipientAddress;

    const packzyPayload = {
      invoice: sanitizeForPackzy(existingGift.giftIdDisplay),
      recipient_name: sanitizeForPackzy(recipientNameRaw),
      recipient_phone: sanitizeForPackzy(existingGift.recipientPhone),
      recipient_address: sanitizeForPackzy(recipientAddressRaw),
      cod_amount: totalCodAmount,
    };

    const urlEncodedBody = Object.entries(packzyPayload)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const response = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: 'POST',
      headers: {
        'Api-Key': 'vfei2q49dhy1rxqxjs6xntkkvc2odeax',
        'Secret-Key': 'n4wr4fhdohq0x3gmm8xg3pp1',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: urlEncodedBody,
    });

    const responseText = await response.text();
    let responseData;

    if (!response.ok) {
      console.error(`Packzy API Error (Gifts): Status ${response.status}`, responseText);
      try {
        responseData = JSON.parse(responseText);
        return { success: false, error: `SteadFast API Error: ${responseData.message || 'Failed to create consignment.'}` };
      } catch (e) {
        return { success: false, error: `SteadFast API returned an error page. Status: ${response.status}.` };
      }
    }

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return { success: false, error: "SteadFast API returned an unexpected response." };
    }

    if (responseData.status !== 200) {
      return { success: false, error: `SteadFast API Error: ${responseData.message || 'Failed to create consignment.'}` };
    }

    const { consignment } = responseData;

    const giftUpdateSuccess = await updateGiftInDb(gift.id, {
      courierStatus: 'Shipped',
      packzyConsignmentId: consignment.consignment_id.toString(),
      packzyTrackingCode: consignment.tracking_code,
      shippingArea: shippingArea,
      shippingCharge: numericShippingCharge,
    } as any, actingUser);

    if (!giftUpdateSuccess) {
      return { success: false, error: "Consignment created, but failed to update gift record." };
    }

    const io = getIO();
    if (io) {
      io.emit("gift-updated", { type: 'update', gift: giftUpdateSuccess });
    }

    const telegramMessage = `
<b>🎁 Gift Shipped via SteadFast!</b>

<b>Gift ID:</b> <code>${existingGift.giftIdDisplay}</code>
<b>Item(s):</b> ${existingGift.giftItemName}
<b>Recipient:</b> ${recipientNameRaw}
<b>COD (Shipping):</b> ${totalCodAmount.toLocaleString('en-IN')} BDT
<b>Sent By:</b> ${actingUser.name}
    `;

    const courierReplyMarkup = {
      inline_keyboard: [
        [
          {
            text: "📦 Track Gift",
            url: `https://steadfast.com.bd/tl/${consignment.tracking_code}`
          }
        ]
      ]
    };

    await sendTelegramMessage(telegramMessage, courierReplyMarkup);

    revalidatePath("/(app)/gifts");

    return { success: true, consignment };

  } catch (error) {
    console.error("Error in transferGiftToCourierAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
