import { redirect } from "react-router";
import { eq } from "drizzle-orm";

import { getSession } from "./session.server";
import type { SessionUser } from "./auth.server";
import db from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

export const userSessionGet = async (
  request: Request
): Promise<SessionUser> => {
  const session = await getSession(request.headers.get("cookie"));
  const user = session.get("user") as SessionUser;

  if (user?.id) {
    const userSession = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.fbId, user.id));

    user.activeSession = userSession[0]?.activeSessionId ?? undefined;
  }

  return user;
};

export const userRequire = async (request: Request) => {
  const user = await userSessionGet(request);
  if (!user) {
    throw redirect("/");
  }

  return null;
};
