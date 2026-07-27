import { type LoaderFunction, type MetaFunction, redirect } from "react-router";

import { authenticator } from "~/auth/auth.server";
import { getPageTitle } from "~/utils/utils";

export const meta: MetaFunction = () => {
	return [{ title: getPageTitle("Log ind med Untappd") }];
};

const categorizeError = (error: unknown): string => {
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes("untappd_oauth_state_mismatch")) return "state_mismatch";
	if (message.includes("token")) return "token_exchange";
	if (message.includes("profile") || message.includes("user response")) {
		return "profile_fetch";
	}

	return "verify";
};

export const loader: LoaderFunction = async ({ request }) => {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");

	if (!code) {
		return redirect("/auth/login");
	}

	try {
		// authenticate() throws a redirect Response on success; must be awaited
		// so failures are caught here instead of becoming unhandled rejections.
		return await authenticator.authenticate("Untappd", request);
	} catch (error) {
		// A thrown Response is the strategy's own (successful) redirect, not a
		// failure — let it propagate instead of masking it as a login error.
		if (error instanceof Response) throw error;

		console.error(`Untappd callback error [${categorizeError(error)}]`, error);
		return redirect("/auth/login");
	}
};
