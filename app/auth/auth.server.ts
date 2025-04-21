import { Authenticator } from "remix-auth";
import { TOTPStrategy } from "remix-auth-totp";
import { redirect } from "react-router";
import { eq } from "drizzle-orm";

import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";
import { getSession, commitSession } from "./session.server";

import { sendMagicLinkEmail } from "./email.server";

export type SessionUser = {
  id: number;
  email: string;
  activeSessionId?: number;
};

export const authenticator = new Authenticator<SessionUser>();

authenticator.use(
  new TOTPStrategy<SessionUser>(
    {
      secret: process.env.TOTP_SECRET || "",
      totpGeneration: {
        digits: 6,
        charSet: "0123456789",
        period: 300,
        algorithm: "SHA-256",
      },
      emailSentRedirect: "/auth/verify",
      magicLinkPath: "/auth/verify",
      successRedirect: "/sessions",
      failureRedirect: "/auth/verify",
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

      const session = await getSession(request.headers.get("cookie"));
      session.set("user", user);

      const sessionCookie = await commitSession(session);

      throw redirect("/sessions", {
        headers: {
          "Set-Cookie": sessionCookie,
        },
      });
    }
  ),
  "TOTP"
);
