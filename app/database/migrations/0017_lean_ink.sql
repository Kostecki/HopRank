CREATE TABLE `pending_redirects` (
	`email` text PRIMARY KEY NOT NULL,
	`redirect_to` text NOT NULL,
	`expires_at` integer NOT NULL
);
