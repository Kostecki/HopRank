import { Authenticator } from "remix-auth";
import { TOTPStrategy } from "remix-auth-totp";
import { eq } from "drizzle-orm";

import { UntappdStrategy } from "./untappd-strategy.server";

import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

import { sendMagicLinkEmail } from "./email.server";
import invariant from "tiny-invariant";
import { commitSession, getSession } from "./session.server";
import { redirect } from "react-router";

export type SessionUser = {
  id: number;
  email: string;
  untappdId?: number;
  untappdAccessToken?: string;
  name?: string;
  avatar?: string;
  activeSessionId?: number;
};

export const authenticator = new Authenticator<SessionUser>();

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
      let dbUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .then((rows) => rows[0]);

      if (!dbUser) {
        dbUser = await db
          .insert(usersTable)
          .values({ email })
          .returning()
          .then((rows) => rows[0]);
      }

      const user: SessionUser = {
        id: dbUser.id,
        email: dbUser.email,
        activeSessionId: dbUser.activeSessionId ?? undefined,
      };

      const session = await getSession(request.headers.get("Cookie"));
      session.set("user", user);

      const sessionCookie = await commitSession(session);

      throw redirect("/", {
        headers: {
          "Set-Cookie": sessionCookie,
        },
      });
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
      const { untappdId, email, firstName, lastName, avatar } = profile;
      const fullName = `${firstName} ${lastName}`;

      let dbUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .then((rows) => rows[0]);

      if (!dbUser) {
        dbUser = await db
          .insert(usersTable)
          .values({
            untappdId: untappdId,
            email: email,
          })
          .returning()
          .then((rows) => rows[0]);
      }

      const user: SessionUser = {
        id: dbUser.id,
        email: dbUser.email,
        untappdId,
        untappdAccessToken: accessToken,
        name: fullName,
        avatar,
        activeSessionId: undefined,
      };

      const session = await getSession(request.headers.get("cookie"));
      session.set("user", user);

      const sessionCookie = await commitSession(session);

      throw redirect("/", {
        headers: {
          "Set-Cookie": sessionCookie,
        },
      });
    }
  ),
  "Untappd"
);
