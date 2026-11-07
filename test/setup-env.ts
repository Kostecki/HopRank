// Stubs for every required env var (see app/utils/env.server.ts), so importing
// a `*.server.ts` module doesn't fail the env check.
process.env.SESSION_SECRET ??= "test-session-secret";
process.env.APP_URL ??= "http://localhost:3000";
process.env.TOTP_SECRET ??= "test-totp-secret";
process.env.UNTAPPD_CLIENT_ID ??= "test-untappd-client-id";
process.env.UNTAPPD_CLIENT_SECRET ??= "test-untappd-client-secret";
process.env.DATABASE_PATH ??= "./test/.tmp";
process.env.SMTP_FROM ??= "test@example.com";
process.env.UNTAPPD_REDIRECT_URL ??=
	"http://localhost:3000/auth/untappd/callback";
