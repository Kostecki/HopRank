import type { SessionUser } from "~/types/user";

import { getSession } from "./session.server";

export const userSessionGet = async (request: Request) => {
  const session = await getSession(request.headers.get("cookie"));
  const user = session.get("user") as SessionUser;

  return user;
};
