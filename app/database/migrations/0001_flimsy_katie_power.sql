DROP INDEX `beers_session_id_untappd_beer_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `uniqueSessionBeer` ON `beers` (`session_id`,`untappd_beer_id`);--> statement-breakpoint
DROP INDEX `votes_session_id_user_id_beer_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `uniqueSessionUserBeer` ON `votes` (`session_id`,`user_id`,`beer_id`);