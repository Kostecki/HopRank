// Stubs for every invariant()-guarded env var, so an accidental transitive
// import of a `*.server.ts` module doesn't crash the test process.
process.env.SESSION_SECRET ??= "test-session-secret";
process.env.APP_URL ??= "http://localhost:3000";
process.env.TOTP_SECRET ??= "test-totp-secret";
process.env.UNTAPPD_CLIENT_ID ??= "test-untappd-client-id";
process.env.UNTAPPD_CLIENT_SECRET ??= "test-untappd-client-secret";
process.env.DATABASE_PATH ??= "./test/.tmp";
process.env.SMTP_FROM ??= "test@example.com";
