CREATE INDEX `bar_placements_session_id_idx` ON `bar_placements` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_bars_session_id_idx` ON `session_bars` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_criteria_session_id_idx` ON `session_criteria` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_state_status_idx` ON `session_state` (`status`);--> statement-breakpoint
CREATE INDEX `session_users_user_id_idx` ON `session_users` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_created_by_idx` ON `sessions` (`created_by`);