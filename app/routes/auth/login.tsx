import { data, type MetaFunction, redirect } from "react-router";

import type { Route } from "./+types/login";

import { authenticator } from "~/auth/auth.server";
import { setPendingRedirect } from "~/auth/pending-redirect.server";
import { commitSession, getSession } from "~/auth/session.server";
import { userSessionGet } from "~/auth/users.server";
import LoginForm from "~/components/auth/LoginForm";
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
			session.unset("redirectTo");
		}

		const cookie = await commitSession(session);
		return redirect(target, {
			headers: { "Set-Cookie": cookie },
		});
	}

	return null;
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

		return data(
			{ error: "Der skete en fejl under login. Prøv igen." },
			{ status: 500 },
		);
	}
}

export default function Login() {
	return <LoginForm />;
}
