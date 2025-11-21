PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_beers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`untappd_beer_id` integer NOT NULL,
	`name` text NOT NULL,
	`brewery_name` text NOT NULL,
	`style` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_beers`("id", "untappd_beer_id", "name", "brewery_name", "style", "label", "created_at", "last_updated_at") SELECT "id", "untappd_beer_id", "name", "brewery_name", "style", "label", "created_at", "last_updated_at" FROM `beers`;--> statement-breakpoint
DROP TABLE `beers`;--> statement-breakpoint
ALTER TABLE `__new_beers` RENAME TO `beers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `beers_untappd_beer_id_unique` ON `beers` (`untappd_beer_id`);--> statement-breakpoint
CREATE TABLE `__new_session_state` (
	`session_id` integer PRIMARY KEY NOT NULL,
	`current_beer_id` integer,
	`current_beer_order` integer,
	`status` text DEFAULT 'created' NOT NULL,
	`last_updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_beer_id`) REFERENCES `beers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_state`("session_id", "current_beer_id", "current_beer_order", "status", "last_updated_at") SELECT "session_id", "current_beer_id", "current_beer_order", "status", "last_updated_at" FROM `session_state`;--> statement-breakpoint
DROP TABLE `session_state`;--> statement-breakpoint
ALTER TABLE `__new_session_state` RENAME TO `session_state`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`untappd_id` integer,
	`name` text,
	`username` text,
	`email` text NOT NULL,
	`avatar_url` text,
	`admin` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "untappd_id", "name", "username", "email", "avatar_url", "admin", "created_at", "last_updated_at") SELECT "id", "untappd_id", "name", "username", "email", "avatar_url", "admin", "created_at", "last_updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);