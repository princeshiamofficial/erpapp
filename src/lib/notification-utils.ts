
"use server";

import { toast } from '@/hooks/use-toast';
import { getGlobalSettings } from './settings-service';
import fs from 'fs';
import path from 'path';

function writeTelegramLog(message: string) {
  try {
    const logDir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'telegram-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (e) {
    console.error("Failed to write to telegram log:", e);
  }
}

export async function sendTelegramMessage(message: string, replyMarkup?: any): Promise<boolean> {
  try {
    const settings = await getGlobalSettings();
    const token = settings.telegramBotToken;
    const chatIds = settings.telegramChatIds;

    if (!token || !chatIds || chatIds.length === 0) {
      const warningMsg = `Telegram settings are not configured. Bot Token: ${token ? 'Configured' : 'Missing'}, Chat IDs: ${chatIds ? chatIds.length : 0}`;
      console.warn(warningMsg);
      writeTelegramLog(warningMsg);
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const redirectDomain = settings.telegramRedirectDomain || 'https://app.colorhutbd.xyz';

    // Sanitize localhost/127.0.0.1 URLs since Telegram API rejects non-public URLs
    let sanitizedMessage = message;
    if (message) {
      sanitizedMessage = message.replace(
        /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g,
        redirectDomain
      );
    }

    let sanitizedReplyMarkup = replyMarkup;
    if (replyMarkup) {
      try {
        const jsonStr = JSON.stringify(replyMarkup);
        const sanitizedJsonStr = jsonStr.replace(
          /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g,
          redirectDomain
        );
        sanitizedReplyMarkup = JSON.parse(sanitizedJsonStr);
      } catch (e) {
        console.error("Error sanitizing Telegram reply markup:", e);
      }
    }

    let allSuccessful = true;
    for (const chatId of chatIds) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: sanitizedMessage,
            parse_mode: 'HTML',
            reply_markup: sanitizedReplyMarkup,
          }),
          cache: 'no-store',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseData = await response.json();
        if (responseData.ok) {
          console.log(`Telegram message sent successfully to chat ID: ${chatId}.`);
        } else {
          allSuccessful = false;
          const errorMsg = `Failed to send Telegram message to chat ID: ${chatId}: ${responseData.description}`;
          console.error(errorMsg);
          writeTelegramLog(errorMsg);
        }
      } catch (error) {
        allSuccessful = false;
        const errorMsg = `Error sending Telegram message to chat ID: ${chatId}: ${error instanceof Error ? error.stack : error}`;
        console.error(errorMsg);
        writeTelegramLog(errorMsg);
      }
    }
    return allSuccessful;
  } catch (error) {
    const errorMsg = `Error sending Telegram messages: ${error instanceof Error ? error.stack : error}`;
    console.error(errorMsg);
    writeTelegramLog(errorMsg);
    return false;
  }
}

export const initializeFCM = async (): Promise<string | null> => {
  console.log("[NotificationUtils] initializeFCM placeholder called");
  return null;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  console.log("[NotificationUtils] requestNotificationPermission called");
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn("[NotificationUtils] Notifications not supported by this browser.");
    toast({ title: "Notifications Not Supported", description: "This browser does not support desktop notifications.", variant: "destructive" });
    return null;
  }
  try {
    console.log("[NotificationUtils] Requesting permission via Notification.requestPermission()...");
    const permission = await Notification.requestPermission();
    console.log("[NotificationUtils] Permission result -", permission);
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled!", description: "You will now receive updates." });
    } else if (permission === 'denied') {
      toast({ title: "Notifications Blocked", description: "Please enable notifications in browser settings if you wish to receive them.", variant: "destructive", duration: 7000 });
    } else {
      toast({ title: "Notifications Dismissed", description: "You can enable notifications later if you change your mind." });
    }
    return permission;
  } catch (error) {
    console.error('[NotificationUtils] Error requesting notification permission:', error);
    toast({ title: "Permission Error", description: "Could not request notification permission.", variant: "destructive" });
    return null;
  }
};

