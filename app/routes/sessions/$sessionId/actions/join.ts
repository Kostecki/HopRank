import { eq } from "drizzle-orm";
import { redirectWithError, redirectWithSuccess } from "remix-toast";

import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

import { wait } from "~/utils/utils";

import type { Route } from "../+types";

export async function action({ params, request }: Route.ActionArgs) {
  const { sessionId } = params;
  const formData = await request.formData();
  const userId = formData.get("userId");

  try {
    await wait(250); // Simulate a delay to show the loading state

    await db
      .update(usersTable)
      .set({ activeSessionId: Number(sessionId) })
      .where(eq(usersTable.id, Number(userId)));

    return redirectWithSuccess(
      `/sessions/${sessionId}`,
      "Du deltager nu i smagningen"
    );
  } catch (error) {
    console.error("Error updating user session:", error);
    return redirectWithError("/sessions", "Kunne ikke gå til smagningen");
  }
}
