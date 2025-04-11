import { redirect, useLoaderData } from "react-router";

import { userSessionGet } from "~/auth/users.server";
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

  const activeSessions = await getActiveSessions();

  return { user, activeSessions };
}

export default function Sessions() {
  const { user, activeSessions } = useLoaderData<typeof loader>();

  return <SessionsTable mt={64} user={user} sessions={activeSessions} />;
}
