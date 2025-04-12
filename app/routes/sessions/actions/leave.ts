import { redirect } from "react-router";
import { redirectWithError } from "remix-toast";

import { userSessionGet } from "~/auth/users.server";
import { leaveSession } from "~/database/helpers";

import type { Route } from "../$sessionId/+types";

export async function action({ request }: Route.ActionArgs) {
  const user = await userSessionGet(request);

  try {
    await leaveSession(user.id);

    return redirect("/");
  } catch (error) {
    console.error("Error leaving session:", error);
    redirectWithError("/", "Kunne ikke forlade smagningen");
  }
}
