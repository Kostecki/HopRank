PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_beers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`untappd_beer_id` integer NOT NULL,
	`name` text NOT NULL,
	`brewery_name` text NOT NULL,
	`style` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `__new_beers`("id", "untappd_beer_id", "name", "brewery_name", "style", "label", "created_at", "last_updated_at") SELECT "id", "untappd_beer_id", "name", "brewery_name", "style", "label", "created_at", "last_updated_at" FROM `beers`;--> statement-breakpoint
DROP TABLE `beers`;--> statement-breakpoint
ALTER TABLE `__new_beers` RENAME TO `beers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `beers_untappd_beer_id_unique` ON `beers` (`untappd_beer_id`);