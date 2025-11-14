import { type MetaFunction, redirect, useLoaderData } from "react-router";

import { authenticator } from "~/auth/auth.server";
import { userSessionGet } from "~/auth/users.server";

import LoginForm from "~/components/auth/LoginForm";

import { getPageTitle } from "~/utils/utils";

import { Card, Divider } from "@mantine/core";
import { eq } from "drizzle-orm";
import { SessionTabs } from "~/components/SessionTabs";
import { db } from "~/database/config.server";
import { sessionState, sessions } from "~/database/schema.server";
import { SessionStatus } from "~/types/session";
import type { Route } from "./+types/login";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind") }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user) return redirect("/");

  const sessionsRaw = await db
    .select()
    .from(sessions)
    .innerJoin(sessionState, eq(sessions.id, sessionState.sessionId));

  const allSessions = sessionsRaw.map(
    ({ sessions: session, session_state }) => ({
      id: session.id,
      name: session.name,
      joinCode: session.joinCode,
      participants: 0,
      beers: 0,
      status: session_state.status,
      createdAt: session.createdAt,
    })
  );

  return {
    activeSessions: allSessions.filter(
      (s) => s.status === SessionStatus.active
    ),
    finishedSessions: allSessions.filter(
      (s) => s.status === SessionStatus.finished
    ),
  };
}

export async function action({ request }: Route.ActionArgs) {
  try {
    return await authenticator.authenticate("TOTP", request);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("error", error);

    return {
      error: "An error occurred during login. Please try again.",
    };
  }
}

export default function Login() {
  const { activeSessions, finishedSessions } = useLoaderData<typeof loader>();

  return (
    <>
      <LoginForm />

      <Divider my="xl" opacity={0.5} />

      <Card shadow="lg" padding="lg" radius="md">
        <SessionTabs
          activeSessions={activeSessions}
          finishedSessions={finishedSessions}
          readOnly
        />
      </Card>
    </>
  );
}
