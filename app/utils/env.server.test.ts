import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env.server";

const base = {
	APP_URL: "https://hr.example",
	SESSION_SECRET: "secret",
	TOTP_SECRET: "secret",
	UNTAPPD_CLIENT_ID: "id",
	UNTAPPD_CLIENT_SECRET: "secret",
	UNTAPPD_REDIRECT_URL: "https://hr.example/auth/untappd/callback",
	DATABASE_PATH: "/data",
	SMTP_FROM: "HopRank <hr@example.com>",
	NODE_ENV: "development",
};

describe("parseServerEnv", () => {
	it("applies defaults, treating empty values as unset", () => {
		const env = parseServerEnv({
			...base,
			MAX_SESSION_AGE_HOURS: "",
			DATABASE_FILE_NAME: "",
		});

		expect(env.MAX_SESSION_AGE_HOURS).toBe(24);
		expect(env.MAX_SESSION_IDLE_TIME_HOURS).toBe(6);
		expect(env.DATABASE_FILE_NAME).toBe("data.db");
		expect(env.ADMIN_USER_EMAILS).toEqual([]);
	});

	it("parses numbers and the admin email list", () => {
		const env = parseServerEnv({
			...base,
			MAX_SESSION_AGE_HOURS: "12",
			ADMIN_USER_EMAILS: " A@Example.com, ,b@example.com ",
		});

		expect(env.MAX_SESSION_AGE_HOURS).toBe(12);
		expect(env.ADMIN_USER_EMAILS).toEqual(["a@example.com", "b@example.com"]);
	});

	it("names every missing or invalid variable", () => {
		const parse = () =>
			parseServerEnv({
				...base,
				SESSION_SECRET: undefined,
				APP_URL: "not a url",
				MAX_SESSION_AGE_HOURS: "0",
			});

		expect(parse).toThrow(/SESSION_SECRET/);
		expect(parse).toThrow(/APP_URL/);
		expect(parse).toThrow(/MAX_SESSION_AGE_HOURS/);
	});

	it("requires SMTP settings in production only", () => {
		expect(() => parseServerEnv({ ...base, NODE_ENV: "production" })).toThrow(
			/SMTP_HOST/,
		);

		expect(
			parseServerEnv({
				...base,
				NODE_ENV: "production",
				SMTP_HOST: "smtp.example.com",
				SMTP_PORT: "465",
				SMTP_USER: "user",
				SMTP_PASS: "pass",
			}).SMTP_PORT,
		).toBe(465);
	});
});
