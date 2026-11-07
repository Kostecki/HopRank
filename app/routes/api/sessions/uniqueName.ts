import { sql } from "drizzle-orm";
import { createNameId } from "mnemonic-id";
import { data } from "react-router";

import type { Route } from "./+types/uniqueName";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { sessions } from "~/database/schema.server";
import { sessionNameSchema } from "~/schemas/session";
import { parseOrThrow } from "~/utils/validation.server";

const MAX_GENERATE_ATTEMPTS = 20;

const titleCaseName = (name: string) => {
	return name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("-");
};

// Same comparison as the unique index on lower(name).
const nameExists = async (name: string) =>
	!!(await db.query.sessions.findFirst({
		where: sql`lower(${sessions.name}) = lower(${name})`,
		columns: { id: true },
	}));

/**
 * With a name: whether it's free. Without one: a generated name that's free,
 * with a number added if every attempt is taken.
 */
export async function action({ request }: Route.ActionArgs) {
	await requireUser(request);

	const formData = await request.formData();
	const inputName = formData.get("name");

	if (typeof inputName === "string" && inputName.trim() !== "") {
		const name = parseOrThrow(sessionNameSchema, inputName);
		return data({ name, unique: !(await nameExists(name)) });
	}

	for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
		const name = titleCaseName(createNameId());
		if (!(await nameExists(name))) {
			return data({ name, unique: true });
		}
	}

	const name = `${titleCaseName(createNameId())}-${Date.now()}`;
	return data({ name, unique: true });
}
