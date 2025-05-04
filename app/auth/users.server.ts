import { getSession } from "./session.server";

import type { SessionUser } from "~/types/user";

export const userSessionGet = async (request: Request) => {
  const session = await getSession(request.headers.get("cookie"));
  const user = session.get("user") as SessionUser;

  return user;
};
