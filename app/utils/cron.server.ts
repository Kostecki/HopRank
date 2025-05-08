import cron from "node-cron";

import { closeInactiveSessions } from "~/database/utils/closeInactiveSessions.server";

let started = false;

export function startCron() {
  if (started) return;

  console.log("Starting session cleanup cron job..");

  started = true;

  cron.schedule("*/30 * * * *", async () => {
    console.log("Starting session cleanup job...");

    await closeInactiveSessions();
  });
}
