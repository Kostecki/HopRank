import { z } from "zod";

const required = z.string().min(1);

const positiveHours = (fallback: number) =>
	z.coerce.number().positive().default(fallback);

const serverEnvSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),

		APP_URL: z.url(),
		SESSION_SECRET: required,
		TOTP_SECRET: required,

		UNTAPPD_CLIENT_ID: required,
		UNTAPPD_CLIENT_SECRET: required,
		UNTAPPD_REDIRECT_URL: z.url(),
		UNTAPPD_DEV_CALLBACK_URL: z
			.url()
			.default("http://localhost:5173/auth/untappd/callback"),

		DATABASE_PATH: required,
		DATABASE_FILE_NAME: required.default("data.db"),

		MAX_SESSION_AGE_HOURS: positiveHours(24),
		MAX_SESSION_IDLE_TIME_HOURS: positiveHours(6),

		ADMIN_USER_EMAILS: z
			.string()
			.default("")
			.transform((emails) =>
				emails
					.split(",")
					.map((email) => email.trim().toLowerCase())
					.filter((email) => email.length > 0),
			),

		SMTP_FROM: required,
		SMTP_HOST: required.optional(),
		SMTP_PORT: z.coerce.number().int().positive().optional(),
		SMTP_USER: required.optional(),
		SMTP_PASS: required.optional(),
	})
	.superRefine((env, ctx) => {
		// Outside production, emails are logged instead of sent.
		if (env.NODE_ENV !== "production") return;

		for (const key of [
			"SMTP_HOST",
			"SMTP_PORT",
			"SMTP_USER",
			"SMTP_PASS",
		] as const) {
			if (env[key] === undefined) {
				ctx.addIssue({
					code: "custom",
					path: [key],
					message: "Required in production",
				});
			}
		}
	});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Compose passes `${VAR}` as an empty string when VAR is unset, so empty
 * values count as missing and get their default.
 */
function withoutEmptyValues(source: NodeJS.ProcessEnv) {
	return Object.fromEntries(
		Object.entries(source).filter(([, value]) => value !== ""),
	);
}

export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
	const result = serverEnvSchema.safeParse(withoutEmptyValues(source));
	if (!result.success) {
		throw new Error(
			`Invalid environment variables:\n${z.prettifyError(result.error)}`,
		);
	}

	return result.data;
}

/** Server environment, checked once at startup. */
export const env = parseServerEnv(process.env);
