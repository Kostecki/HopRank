import { eq } from "drizzle-orm";
import { data } from "react-router";

import type { Route } from "./+types/update";

import { requireUser } from "~/auth/requireUser.server";
import { commitSession, getSession } from "~/auth/session.server";
import { db } from "~/database/config.server";
import { users } from "~/database/schema.server";
import { userNameSchema } from "~/schemas/user";
import { parseOrThrow } from "~/utils/validation.server";

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request);

	const formData = await request.formData();
	const name = parseOrThrow(userNameSchema, formData.get("name") ?? undefined);

	try {
		await db.update(users).set({ name }).where(eq(users.id, user.id));
	} catch (error) {
		console.error("Error updating name:", error);
		return data({ message: "Navnet kunne ikke gemmes" }, { status: 500 });
	}

	const updatedSessionUser = { ...user, name };

	const session = await getSession(request.headers.get("Cookie"));
	session.set("user", updatedSessionUser);

	return data(
		{ success: true, user: updatedSessionUser },
		{ headers: { "Set-Cookie": await commitSession(session) } },
	);
}
