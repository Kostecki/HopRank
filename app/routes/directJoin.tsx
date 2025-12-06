import { Text } from "@mantine/core";
import { redirect } from "react-router";

import type { Route } from "./+types/directJoin";

import { commitSession, getSession } from "~/auth/session.server";
import { userSessionGet } from "~/auth/users.server";
import {
	joinSessionByCode,
	SessionNotFoundError,
	SessionStateNotFoundError,
} from "~/database/utils/joinSessionByCode.server";
import { JOIN_CODE_PATTERN, normalizeJoinCode } from "~/utils/join";
import { isSafeRedirect } from "~/utils/utils";

export async function loader({ params, request }: Route.LoaderArgs) {
	const rawCode = params?.joinCode;
	if (!rawCode) {
		throw new Response("Join code is required", {
			status: 400,
			statusText: "En pinkode er påkrævet for at deltage i en smagning",
		});
	}

	const joinCode = normalizeJoinCode(rawCode);
	if (!JOIN_CODE_PATTERN.test(joinCode)) {
		throw new Response("Invalid join code format", {
			status: 400,
			statusText: "Pinkoden er ugyldig",
		});
	}

	const user = await userSessionGet(request);
	if (!user) {
		const url = new URL(request.url);
		const redirectTo = url.pathname + (url.search || "");

		const session = await getSession(request.headers.get("Cookie"));
		if (isSafeRedirect(redirectTo)) {
			session.set("redirectTo", redirectTo);
		}
		const cookie = await commitSession(session);

		return redirect("/auth/login", {
			headers: { "Set-Cookie": cookie },
		});
	}

	try {
		const result = await joinSessionByCode({ joinCode, userId: user.id });
		if (result.readOnly) {
			return redirect(`/sessions/${result.session.id}/view`);
		}

		return redirect(`/sessions/${result.session.id}`);
	} catch (error) {
		if (error instanceof SessionNotFoundError) {
			throw new Response("Pinkoden er ikke gyldig", { status: 404 });
		}

		if (error instanceof SessionStateNotFoundError) {
			throw new Response("Intern fejl: session status mangler", {
				status: 500,
			});
		}

		console.error("Direct join unexpected error", error);
		throw new Response("Der skete en intern fejl", { status: 500 });
	}
}

export default function DirectJoin() {
	return <Text>Går til smagningen..</Text>;
}
