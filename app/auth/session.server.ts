import { createCookieSessionStorage } from "react-router";
import invariant from "tiny-invariant";

const maxAge = 60 * 60 * 24; // 24 hours

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
invariant(SESSION_SECRET, "SESSION_SECRET must be set in .env");
invariant(COOKIE_DOMAIN, "COOKIE_DOMAIN must be set in .env");

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: "_session",
      maxAge,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secrets: [SESSION_SECRET],
      secure: process.env.NODE_ENV === "production",
      domain: COOKIE_DOMAIN,
    },
  });
