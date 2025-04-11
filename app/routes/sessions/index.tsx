import { useLoaderData } from "react-router";
import { count, desc, eq } from "drizzle-orm";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionsTable, usersTable } from "~/database/schema.server";

import SessionsTable from "~/components/SessionsTable";

import { setPageTitle } from "~/utils/utils";

import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: setPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  const activeSessions = await db
    .select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      active: sessionsTable.active,
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
      userCount: count(usersTable.id).as("userCount"),
    })
    .from(sessionsTable)
    .leftJoin(usersTable, eq(usersTable.activeSessionId, sessionsTable.id))
    .where(eq(sessionsTable.active, true))
    .groupBy(sessionsTable.id)
    .orderBy(desc(sessionsTable.createdAt));

  return { user, activeSessions };
}

export default function Sessions() {
  const { user, activeSessions } = useLoaderData<typeof loader>();

  return <SessionsTable mt={64} user={user} sessions={activeSessions} />;
}
