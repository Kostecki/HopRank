import { eq } from "drizzle-orm";
import { Authenticator } from "remix-auth";
import { OAuth2Strategy } from "remix-auth-oauth2";
import invariant from "tiny-invariant";

import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

export type SessionUser = {
  id: number;
  fbId: string;
  name: string;
  picture: {
    height: number;
    is_silhouette: boolean;
    url: string;
    width: number;
  };
  activeSession?: number;
};

export const authenticator = new Authenticator<SessionUser>();

const BASE_URL = process.env.BASE_URL;
invariant(BASE_URL, "BASE_URL is required");

const FB_OAUTH_CLIENT_ID = process.env.FB_OAUTH_CLIENT_ID;
const FB_OAUTH_CLIENT_SECRET = process.env.FB_OAUTH_CLIENT_SECRET;
const FB_OAUTH_AUTH_ENDPOINT = process.env.FB_OAUTH_AUTH_ENDPOINT;
const FB_OAUTH_TOKEN_ENDPOINT = process.env.FB_OAUTH_TOKEN_ENDPOINT;
const FB_OAUTH_USERINFO_ENDPOINT = process.env.FB_OAUTH_USERINFO_ENDPOINT;
invariant(FB_OAUTH_CLIENT_ID, "FB_OAUTH_CLIENT_ID must be set in .env");
invariant(FB_OAUTH_CLIENT_SECRET, "FB_OAUTH_CLIENT_SECRET must be set in .env");
invariant(FB_OAUTH_AUTH_ENDPOINT, "FB_OAUTH_AUTH_ENDPOINT must be set in .env");
invariant(
  FB_OAUTH_TOKEN_ENDPOINT,
  "FB_OAUTH_TOKEN_ENDPOINT must be set in .env"
);
invariant(
  FB_OAUTH_USERINFO_ENDPOINT,
  "FB_OAUTH_USERINFO_ENDPOINT must be set in .env"
);

authenticator.use(
  new OAuth2Strategy(
    {
      clientId: FB_OAUTH_CLIENT_ID,
      clientSecret: FB_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: FB_OAUTH_AUTH_ENDPOINT,
      tokenEndpoint: FB_OAUTH_TOKEN_ENDPOINT,
      redirectURI: `${BASE_URL}/auth/callback`,
      scopes: ["public_profile"],
    },
    async ({ tokens }) => {
      const url = `${FB_OAUTH_USERINFO_ENDPOINT}?fields=id,name,picture`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      });
      const profile = await response.json();

      console.log("👤 [auth.server] Facebook profile:", profile);

      if (!profile || profile.error) {
        throw new Error(
          `Failed to fetch user profile from Facebook: ${
            profile?.error?.message || "Unknown error"
          }`
        );
      }

      const user: SessionUser = {
        id: -1,
        fbId: profile.id,
        name: profile.name,
        picture: profile.picture.data,
      };

      const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.fbId, user.fbId));

      if (existingUser.length === 0) {
        const insertedUser = await db
          .insert(usersTable)
          .values({ fbId: user.fbId })
          .returning();

        user.id = insertedUser[0].id;
      } else {
        user.id = existingUser[0].id;
      }

      return user;
    }
  ),
  "facebook"
);
