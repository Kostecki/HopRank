import { redirect } from "react-router";

import { getSession } from "./session.server";

import type { SessionUser } from "./auth.server";

export const userSessionGet = async (
  request: Request
): Promise<SessionUser> => {
  const session = await getSession(request.headers.get("cookie"));
  const user = session.get("user");

  return user;
};

export const userRequire = async (request: Request) => {
  const user = await userSessionGet(request);
  if (!user) {
    throw redirect("/");
  }

  return null;
};
