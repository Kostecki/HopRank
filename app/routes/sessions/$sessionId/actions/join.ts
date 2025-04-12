import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { redirectWithError } from "remix-toast";

import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

import type { Route } from "../+types";

export async function action({ params, request }: Route.ActionArgs) {
  const { sessionId } = params;
  const formData = await request.formData();
  const userId = formData.get("userId");

  try {
    await db
      .update(usersTable)
      .set({ activeSessionId: Number(sessionId) })
      .where(eq(usersTable.id, Number(userId)));

    return redirect(`/sessions/${sessionId}`);
  } catch (error) {
    console.error("Error updating user session:", error);
    return redirectWithError("/sessions", "Kunne ikke gå til smagningen");
  }
}
