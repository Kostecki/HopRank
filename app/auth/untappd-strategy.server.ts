import { OAuth2Strategy } from "remix-auth-oauth2";

import type {
	UntappdStrategyOptions,
	UntappdStrategyProfile,
	UntappdStrategyVerifyParams,
} from "~/types/untappd";

import {
	commitOAuthStateSession,
	getOAuthStateSession,
} from "./oauth-state.server";

const AUTH_ENDPOINT = "https://untappd.com/oauth/authenticate";
const TOKEN_ENDPOINT = "https://untappd.com/oauth/authorize";
const PROFILE_ENDPOINT = "https://api.untappd.com/v4/user/info?compact=true";

export class UntappdStrategy<User> extends OAuth2Strategy<User> {
	name = "untappd";

	private clientID: string;
	private clientSecret: string;
	private callbackURL: string;

	constructor(
		options: UntappdStrategyOptions,
		verify: (params: UntappdStrategyVerifyParams) => Promise<User>,
	) {
		super(
			{
				authorizationEndpoint: AUTH_ENDPOINT,
				tokenEndpoint: TOKEN_ENDPOINT,
				clientId: options.clientID,
				clientSecret: options.clientSecret,
				redirectURI: options.callbackURL,
			},
			// biome-ignore lint/suspicious/noExplicitAny: Untappd 🤷‍♂️
			verify as any,
		);

		this.clientID = options.clientID;
		this.clientSecret = options.clientSecret;
		this.callbackURL = options.callbackURL;
	}

	async authenticate(request: Request): Promise<User> {
		const url = new URL(request.url);
		const code = url.searchParams.get("code");

		if (!code) {
			const state = crypto.randomUUID();

			const stateSession = await getOAuthStateSession();
			stateSession.set("state", state);

			const authUrl = new URL(AUTH_ENDPOINT);
			authUrl.searchParams.set("client_id", this.clientID);
			authUrl.searchParams.set("response_type", "code");
			authUrl.searchParams.set("redirect_url", this.callbackURL);
			authUrl.searchParams.set("state", state);

			throw new Response(null, {
				status: 302,
				headers: {
					Location: authUrl.toString(),
					"Set-Cookie": await commitOAuthStateSession(stateSession),
				},
			});
		}

		const stateSession = await getOAuthStateSession(
			request.headers.get("Cookie"),
		);
		const expectedState = stateSession.get("state");
		const actualState = url.searchParams.get("state");

		if (!expectedState || actualState !== expectedState) {
			throw new Error("untappd_oauth_state_mismatch");
		}

		const { accessToken, refreshToken, extraParams } =
			await this.tokenRequest(code);

		const profile = await this.userProfile(accessToken);

		const user = await this.verify({
			accessToken,
			refreshToken,
			extraParams,
			profile,
			request,
			// biome-ignore lint/suspicious/noExplicitAny: Untappd 🤷‍♂️
		} as any);

		return user;
	}

	/** Untappd's very broken token exchange */
	async tokenRequest(code: string): Promise<{
		accessToken: string;
		refreshToken?: string;
		extraParams: Record<string, unknown>;
	}> {
		const params = new URLSearchParams({
			client_id: this.clientID,
			client_secret: this.clientSecret,
			response_type: "code",
			redirect_url: this.callbackURL,
			code,
		});

		const url = `${TOKEN_ENDPOINT}?${params.toString()}`;

		const response = await fetch(url);
		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Untappd token request failed: ${error}`);
		}

		const json = await response.json();

		if (!json.response?.access_token) {
			throw new Error("Untappd token response missing access_token");
		}

		return {
			accessToken: json.response.access_token,
			refreshToken: undefined, // Untappd doesn't do refresh tokens
			extraParams: {},
		};
	}

	/** Fetches user info from Untappd */
	async userProfile(accessToken: string): Promise<UntappdStrategyProfile> {
		const response = await fetch(`${PROFILE_ENDPOINT}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Untappd user profile fetch failed: ${error}`);
		}

		const json = await response.json();
		const user = json.response?.user;

		if (!user) {
			throw new Error("Invalid Untappd user response");
		}

		return {
			untappdId: user.id,
			email: user.settings.email_address,
			userName: user.user_name,
			firstName: user.first_name,
			lastName: user.last_name,
			avatar: user.user_avatar,
		};
	}
}
