import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // The reverse proxy in front of the production container doesn't forward
  // the original Host header, so react-router's built-in action CSRF check
  // (introduced in 7.12) sees a host/origin mismatch and 400s every action
  // submission. Since we run via `react-router-serve` (no custom server to
  // set `trust proxy` / read `X-Forwarded-Host`), allowlist the real origin
  // here instead. See https://github.com/remix-run/react-router/releases/tag/react-router%407.12.0
  allowedActionOrigins: ["hr.kostecki.dk"],
} satisfies Config;
