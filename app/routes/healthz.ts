import { sql } from "drizzle-orm";

import { db } from "~/database/config.server";

/** Used by the Docker HEALTHCHECK: the server is up and the database answers. */
export function loader() {
	db.get(sql`select 1`);

	return new Response("ok", {
		headers: { "Cache-Control": "no-store" },
	});
}
