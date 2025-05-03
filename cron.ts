import { startSessionCleanupJob } from "~/utils/sessionCleanup";

console.log("Starting session cleanup cron job..");
startSessionCleanupJob();
