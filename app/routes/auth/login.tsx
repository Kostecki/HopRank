import { Card, Divider } from "@mantine/core";
import { eq } from "drizzle-orm";
import { type MetaFunction, redirect, useLoaderData } from "react-router";

import { SessionStatus } from "~/types/session";
import type { Route } from "./+types/login";

import { authenticator } from "~/auth/auth.server";
import { setPendingRedirect } from "~/auth/pending-redirect.server";
import { commitSession, getSession } from "~/auth/session.server";
import { userSessionGet } from "~/auth/users.server";
import LoginForm from "~/components/auth/LoginForm";
import { SessionTabs } from "~/components/SessionTabs";
import { db } from "~/database/config.server";
import { sessionState, sessions } from "~/database/schema.server";
import { getSessionCounts } from "~/database/utils/getSessionCounts.server";
import { getPageTitle, isSafeRedirect } from "~/utils/utils";

export const meta: MetaFunction = () => {
	return [{ title: getPageTitle("Log ind") }];
};

export async function loader({ request }: Route.LoaderArgs) {
	const user = await userSessionGet(request);
	const session = await getSession(request.headers.get("Cookie"));
	const redirectToFromSession = session.get("redirectTo");

	if (user) {
		const target = isSafeRedirect(redirectToFromSession)
			? (redirectToFromSession as string)
			: "/";
		if (isSafeRedirect(redirectToFromSession)) {
			if (typeof session.unset === "function") {
				session.unset("redirectTo");
			} else {
				session.set("redirectTo", undefined);
			}
		}

		const cookie = await commitSession(session);
		return redirect(target, {
			headers: { "Set-Cookie": cookie },
		});
	}

	const sessionsRaw = await db
		.select()
		.from(sessions)
		.innerJoin(sessionState, eq(sessions.id, sessionState.sessionId));

	const allSessions = await Promise.all(
		sessionsRaw.map(async ({ sessions: session, session_state }) => {
			const counts = await getSessionCounts(session.id);

			return {
				id: session.id,
				name: session.name,
				joinCode: session.joinCode,
				participants: counts.participantCount,
				beers: counts.beerCount,
				status: session_state.status,
				createdAt: session.createdAt,
			};
		}),
	);

	return {
		inProgressSessions: allSessions.filter(
			(s) =>
				s.status === SessionStatus.active || s.status === SessionStatus.created,
		),
		finishedSessions: allSessions.filter(
			(s) => s.status === SessionStatus.finished,
		),
	};
}

export async function action({ request }: Route.ActionArgs) {
	try {
		const clonedRequest = request.clone();
		const formData = await clonedRequest.formData();
		const email = String(formData.get("email") || "").trim();

		const session = await getSession(request.headers.get("Cookie"));
		const redirectTo = session.get("redirectTo");

		if (email && isSafeRedirect(redirectTo)) {
			await setPendingRedirect(email, redirectTo as string);
		}

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
	const { inProgressSessions, finishedSessions } =
		useLoaderData<typeof loader>();

	return (
		<>
			<LoginForm />

			<Divider my="xl" opacity={0.5} />

			<Card shadow="lg" padding="lg" radius="md">
				<SessionTabs
					inProgressSessions={inProgressSessions}
					finishedSessions={finishedSessions}
					readOnly
				/>
			</Card>
		</>
	);
}
