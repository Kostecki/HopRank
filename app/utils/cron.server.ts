import cron, { type ScheduledTask } from "node-cron";

import { closeInactiveSessions } from "~/database/utils/closeInactiveSessions.server";

declare global {
  var __CLEANUP_CRON_STARTED__: boolean | undefined;
}

let task: ScheduledTask | undefined;

const schedule = "*/30 * * * *"; // every 30 minutes
const timezone = "UTC";

export function startCron() {
  if (global.__CLEANUP_CRON_STARTED__) return;
  global.__CLEANUP_CRON_STARTED__ = true;

  // Run once at boot
  closeInactiveSessions()
    .then(() => console.log("[Cron] Initial cleanup run completed"))
    .catch((err) => console.error("[Cron] Initial cleanup run failed:", err));

  task = cron.schedule(
    schedule,
    async () => {
      try {
        await closeInactiveSessions();
        console.log("[Cron] closeInactiveSessions executed");
      } catch (err) {
        console.error("[Cron] closeInactiveSessions failed:", err);
      }
    },
    { timezone }
  );

  task.start();
  console.log(`[Cron] Cleanup cron started`);

  const stop = () => {
    try {
      task?.stop();
      console.log("[Cron] Cleanup cron stopped");
    } catch {}
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
