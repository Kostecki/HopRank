import { redirect } from "react-router";

import type { Route } from "./+types";

import { destroySession, getSession } from "~/auth/session.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const session = await getSession(request.headers.get("cookie"));

  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
};
