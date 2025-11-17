PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_state` (
	`session_id` integer PRIMARY KEY NOT NULL,
	`current_beer_id` integer,
	`current_beer_order` integer,
	`status` text DEFAULT 'created' NOT NULL,
	`last_updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_beer_id`) REFERENCES `beers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_state`("session_id", "current_beer_id", "current_beer_order", "status", "last_updated_at") SELECT "session_id", "current_beer_id", "current_beer_order", "status", "last_updated_at" FROM `session_state`;--> statement-breakpoint
DROP TABLE `session_state`;--> statement-breakpoint
ALTER TABLE `__new_session_state` RENAME TO `session_state`;--> statement-breakpoint
PRAGMA foreign_keys=ON;