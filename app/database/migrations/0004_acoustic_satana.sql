DROP INDEX `sessions_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_name` ON `sessions` (lower("name"));--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_beers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`beer_id` integer,
	`added_by_user_id` integer,
	`order` integer,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`beer_id`) REFERENCES `beers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_beers`("id", "session_id", "beer_id", "added_by_user_id", "order", "status", "created_at") SELECT "id", "session_id", "beer_id", "added_by_user_id", "order", "status", "created_at" FROM `session_beers`;--> statement-breakpoint
DROP TABLE `session_beers`;--> statement-breakpoint
ALTER TABLE `__new_session_beers` RENAME TO `session_beers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_session_state` (
	`session_id` integer PRIMARY KEY NOT NULL,
	`current_beer_id` integer,
	`current_beer_order` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`last_updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_beer_id`) REFERENCES `beers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_state`("session_id", "current_beer_id", "current_beer_order", "status", "last_updated_at") SELECT "session_id", "current_beer_id", "current_beer_order", "status", "last_updated_at" FROM `session_state`;--> statement-breakpoint
DROP TABLE `session_state`;--> statement-breakpoint
ALTER TABLE `__new_session_state` RENAME TO `session_state`;--> statement-breakpoint
CREATE TABLE `__new_session_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_users`("id", "session_id", "user_id") SELECT "id", "session_id", "user_id" FROM `session_users`;--> statement-breakpoint
DROP TABLE `session_users`;--> statement-breakpoint
ALTER TABLE `__new_session_users` RENAME TO `session_users`;--> statement-breakpoint
CREATE UNIQUE INDEX `custom_name` ON `session_users` (`session_id`,`user_id`);