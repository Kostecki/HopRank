ALTER TABLE `sessions` ADD `join_code` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_join_code_unique` ON `sessions` (`join_code`);