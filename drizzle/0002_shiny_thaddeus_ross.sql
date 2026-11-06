CREATE TABLE `bar_placements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`bar_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bar_id`) REFERENCES `session_bars`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_bar_placement` ON `bar_placements` (`bar_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `session_bars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`name` text NOT NULL,
	`foursquare_id` text,
	`added_by_user_id` integer NOT NULL,
	`order` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_bar_venue` ON `session_bars` (`session_id`,`foursquare_id`) WHERE "session_bars"."foursquare_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `mode` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `beer_id` integer REFERENCES beers(id);