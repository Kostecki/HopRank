import { redirect, useLoaderData } from "react-router";
import { count, eq } from "drizzle-orm";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { beersTable } from "~/database/schema.server";
import { getActiveSessions } from "~/database/helpers";

import SessionsTable from "~/components/SessionsTable";

import { getPageTitle } from "~/utils/utils";

import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: getPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user.activeSession) {
    return redirect("/sessions/" + user.activeSession);
  }

  const activeSessionsData = await getActiveSessions();
  const activeSessions = await Promise.all(
    activeSessionsData.map(async (session) => {
      const [beersCount] = await db
        .select({ count: count() })
        .from(beersTable)
        .where(eq(beersTable.sessionId, session.id));

      return {
        ...session,
        beersCount: beersCount.count,
      };
    })
  );

  return { user, activeSessions };
}

export default function Sessions() {
  const { user, activeSessions } = useLoaderData<typeof loader>();

  return <SessionsTable mt={64} user={user} sessions={activeSessions} />;
}
