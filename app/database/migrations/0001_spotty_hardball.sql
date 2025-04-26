ALTER TABLE `users` ADD `untappd_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_untappd_id_unique` ON `users` (`untappd_id`);