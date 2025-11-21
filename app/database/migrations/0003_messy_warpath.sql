PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`beer_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`criterion_id` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`beer_id`) REFERENCES `beers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criterion_id`) REFERENCES `criteria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_ratings`("id", "session_id", "beer_id", "user_id", "criterion_id", "score", "created_at") SELECT "id", "session_id", "beer_id", "user_id", "criterion_id", "score", "created_at" FROM `ratings`;--> statement-breakpoint
DROP TABLE `ratings`;--> statement-breakpoint
ALTER TABLE `__new_ratings` RENAME TO `ratings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_beer_rating` ON `ratings` (`session_id`,`beer_id`,`user_id`,`criterion_id`);--> statement-breakpoint
CREATE TABLE `__new_session_beers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`beer_id` integer NOT NULL,
	`added_by_user_id` integer NOT NULL,
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
CREATE TABLE `__new_session_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`criterion_id` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criterion_id`) REFERENCES `criteria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_criteria`("id", "session_id", "criterion_id") SELECT "id", "session_id", "criterion_id" FROM `session_criteria`;--> statement-breakpoint
DROP TABLE `session_criteria`;--> statement-breakpoint
ALTER TABLE `__new_session_criteria` RENAME TO `session_criteria`;--> statement-breakpoint
CREATE TABLE `__new_session_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_users`("id", "session_id", "active", "user_id") SELECT "id", "session_id", "active", "user_id" FROM `session_users`;--> statement-breakpoint
DROP TABLE `session_users`;--> statement-breakpoint
ALTER TABLE `__new_session_users` RENAME TO `session_users`;--> statement-breakpoint
CREATE UNIQUE INDEX `custom_name` ON `session_users` (`session_id`,`user_id`);