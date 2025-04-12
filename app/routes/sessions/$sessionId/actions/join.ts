import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { redirectWithError } from "remix-toast";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

import type { Route } from "../+types";

export async function action({ params, request }: Route.ActionArgs) {
  const user = await userSessionGet(request);

  const { sessionId } = params;

  try {
    await db
      .update(usersTable)
      .set({ activeSessionId: Number(sessionId) })
      .where(eq(usersTable.id, user.id));

    return redirect(`/sessions/${sessionId}`);
  } catch (error) {
    console.error("Error updating user session:", error);
    return redirectWithError("/sessions", "Kunne ikke gå til smagningen");
  }
}
