ALTER TABLE `beers` ADD `abv` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_beer` ON `session_beers` (`session_id`,`beer_id`);