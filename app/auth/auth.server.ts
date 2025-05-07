import { Authenticator } from "remix-auth";
import { TOTPStrategy } from "remix-auth-totp";
import { redirect } from "react-router";
import invariant from "tiny-invariant";

import { UntappdStrategy } from "./untappd-strategy.server";

import { findOrCreateUserByEmail } from "~/database/utils/findOrCreateUserByEmail.server";
import { sendMagicLinkEmail } from "./email.server";
import { commitSession, getSession } from "./session.server";

import type { SessionUser } from "~/types/user";

export const authenticator = new Authenticator<SessionUser>();

export const isUntappdUser = (user: SessionUser) => {
  return !!user.untappd;
};

const commitSessionUser = async (request: Request, user: SessionUser) => {
  const session = await getSession(request.headers.get("Cookie"));
  session.set("user", user);

  const sessionCookie = await commitSession(session);

  throw redirect("/", {
    headers: {
      "Set-Cookie": sessionCookie,
    },
  });
};

const APP_URL = process.env.APP_URL;
invariant(APP_URL, "APP_URL must be set in .env");

const TOTP_SECRET = process.env.TOTP_SECRET;
invariant(TOTP_SECRET, "TOTP_SECRET must be set in .env");
authenticator.use(
  new TOTPStrategy<SessionUser>(
    {
      secret: TOTP_SECRET || "",
      totpGeneration: {
        digits: 6,
        charSet: "0123456789",
        period: 300,
        algorithm: "SHA-256",
      },
      emailSentRedirect: "/auth/totp",
      magicLinkPath: "/auth/totp",
      successRedirect: "/sessions",
      failureRedirect: "/auth/totp",
      cookieOptions: {
        ...(process.env.NODE_ENV === "production" ? { secure: true } : {}),
      },
      sendTOTP: async ({ email, code, magicLink }) => {
        await sendMagicLinkEmail({ email, code, magicLink });
      },
    },
    async ({ email, request }) => {
      const user = await findOrCreateUserByEmail(email);
      const sessionUser = {
        id: user.id,
        email: user.email,
      };

      return await commitSessionUser(request, sessionUser);
    }
  ),
  "TOTP"
);

const UNTAPPD_CLIENT_ID = process.env.UNTAPPD_CLIENT_ID;
const UNTAPPD_CLIENT_SECRET = process.env.UNTAPPD_CLIENT_SECRET;
invariant(UNTAPPD_CLIENT_ID, "UNTAPPD_CLIENT_ID must be set in .env");
invariant(UNTAPPD_CLIENT_SECRET, "UNTAPPD_CLIENT_SECRET must be set in .env");

authenticator.use(
  new UntappdStrategy<SessionUser>(
    {
      clientID: UNTAPPD_CLIENT_ID,
      clientSecret: UNTAPPD_CLIENT_SECRET,
      callbackURL: `${APP_URL}/auth/untappd/callback`,
    },
    async ({ profile, accessToken, request }) => {
      const { untappdId, email, firstName, lastName, userName, avatar } =
        profile;
      const fullName = `${firstName} ${lastName}`;

      const user = await findOrCreateUserByEmail(
        email,
        untappdId,
        userName,
        fullName
      );
      const sessionUser = {
        id: user.id,
        email: user.email,
        untappd: {
          id: untappdId,
          username: userName,
          accessToken,
          name: fullName,
          avatar,
        },
      };

      return await commitSessionUser(request, sessionUser);
    }
  ),
  "Untappd"
);
