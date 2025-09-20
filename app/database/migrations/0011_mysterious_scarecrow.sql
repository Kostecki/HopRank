PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`weight` real NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_criteria`("id", "name", "description", "weight") SELECT "id", "name", "description", "weight" FROM `criteria`;--> statement-breakpoint
DROP TABLE `criteria`;--> statement-breakpoint
ALTER TABLE `__new_criteria` RENAME TO `criteria`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `criteria_name_unique` ON `criteria` (`name`);