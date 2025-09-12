import { Cookie } from "@mjackson/headers";
import { useEffect, useState } from "react";
import {
	type MetaFunction,
	redirect,
	useFetcher,
	useLoaderData,
} from "react-router";

import TOTPVerify from "~/components/auth/TOTPVerify";

import { authenticator } from "~/auth/auth.server";
import { userSessionGet } from "~/auth/users.server";

import { getPageTitle } from "~/utils/utils";

import type { Route } from "./+types/totp";

export const meta: MetaFunction = () => {
	return [{ title: getPageTitle("Verificér") }];
};

export async function loader({ request }: Route.LoaderArgs) {
	// Check for existing session.
	const user = await userSessionGet(request);

	// If the user is already authenticated, redirect to dashboard.
	if (user) return redirect("/");

	// Get the TOTP cookie and the token from the URL.
	const cookie = new Cookie(request.headers.get("cookie") || "");
	const totpCookie = cookie.get("_totp");

	const url = new URL(request.url);
	const token = url.searchParams.get("t");

	// Authenticate the user via magic-link URL.
	if (token) {
		try {
			return await authenticator.authenticate("TOTP", request);
		} catch (error) {
			if (error instanceof Response) return error;
			if (error instanceof Error) {
				console.error(error);
				return { error: error.message };
			}
			return { error: "Invalid TOTP" };
		}
	}

	// Get the email from the TOTP cookie.
	let email = null;
	if (totpCookie) {
		const params = new URLSearchParams(totpCookie);
		email = params.get("email");
	}

	// If no email is found, redirect to login.
	if (!email) return redirect("/auth/login");

	return { email };
}

export async function action({ request }: Route.ActionArgs) {
	try {
		return await authenticator.authenticate("TOTP", request);
	} catch (error) {
		if (error instanceof Response) {
			const cookie = new Cookie(error.headers.get("Set-Cookie") || "");
			const totpCookie = cookie.get("_totp");

			if (totpCookie) {
				const params = new URLSearchParams(totpCookie);
				return { error: params.get("error") };
			}

			throw error;
		}
		return { error: "Invalid TOTP" };
	}
}

export default function VerifyLogin() {
	const loaderData = useLoaderData<typeof loader>();

	const [code, setCode] = useState("");

	const fetcher = useFetcher();

	const error = "error" in loaderData ? loaderData.error : null;
	const errors = fetcher.data?.error || error;

	useEffect(() => {
		if (code.length === 6) {
			fetcher.submit({ code }, { method: "post" });
		}
	}, [code, fetcher.submit]);

	return (
		<TOTPVerify
			code={code}
			setCode={setCode}
			fetcher={fetcher}
			errors={errors}
		/>
	);
}
