
import { settleAllDeliveredOrdersAction } from '../app/(app)/dashboard/actions';

let isRunning = false;
let lastTriggeredDate: string | null = null;
let lastTriggeredHour: number | null = null;

export function startCronService() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    console.log('[Cron Service] Initializing internal scheduler for 2:00 PM and 10:00 PM BD Time...');

    // Check every 30 seconds to be precise
    setInterval(async () => {
        try {
            // Get current time in Bangladesh (UTC+6)
            const now = new Date();
            const bdTimeStr = now.toLocaleString("en-US", {
                timeZone: "Asia/Dhaka",
                hour12: false
            });

            // format: "MM/DD/YYYY, HH:mm:ss"
            const [datePart, timePart] = bdTimeStr.split(', ');
            const [hour, minute] = timePart.split(':').map(Number);

            const targetHours = [14, 22]; // 2:00 PM and 10:00 PM

            // If we are at the target hour and minute is 0 (first minute of the hour)
            // and we haven't already triggered for this specific hour today
            if (targetHours.includes(hour) && minute === 0) {
                if (lastTriggeredDate !== datePart || lastTriggeredHour !== hour) {
                    if (!isRunning) {
                        isRunning = true;
                        lastTriggeredDate = datePart;
                        lastTriggeredHour = hour;

                        console.log(`[Cron Service] Triggering automated sync at ${hour}:00 BD Time...`);
                        const result = await settleAllDeliveredOrdersAction();
                        console.log(`[Cron Service] Sync status: ${result.success ? 'Success' : 'Failed'}. Settled: ${result.settledCount}`);

                        isRunning = false;
                    }
                }
            }
        } catch (error) {
            console.error('[Cron Service] Error in scheduler:', error);
            isRunning = false;
        }
    }, 30000); // Check every 30 seconds
}
