import { redirect } from "react-router";

import { destroySession, getSession } from "~/auth/session.server";

import type { Route } from "./+types";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const session = await getSession(request.headers.get("cookie"));

  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
};
