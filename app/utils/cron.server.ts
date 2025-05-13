import cron from "node-cron";

import { closeInactiveSessions } from "~/database/utils/closeInactiveSessions.server";

let started = false;

export function startCron() {
  if (started) return;

  started = true;

  cron.schedule("*/30 * * * *", async () => {
    await closeInactiveSessions();
  });
}
