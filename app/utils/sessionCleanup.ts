import cron from "node-cron";

import { closeInactiveSessions } from "~/database/utils/closeInactiveSessions.server";

/**
 * Starts a scheduled job to close inactive sessions.
 * This job runs every 30 minutes and triggers the `closeInactiveSessions` function.
 */
export const startSessionCleanupJob = () => {
  console.log("Starting session cleanup job...");

  cron.schedule("*/30 * * * *", async () => {
    await closeInactiveSessions();
  });
};
