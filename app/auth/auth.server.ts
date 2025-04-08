import { Authenticator } from "remix-auth";
import { OAuth2Strategy } from "remix-auth-oauth2";
import invariant from "tiny-invariant";

import db from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

export type SessionUser = {
  id: string;
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
    },
    async ({ tokens }) => {
      const url = `${FB_OAUTH_USERINFO_ENDPOINT}?fields=id,name,picture`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      });
      const profile = await response.json();

      const user: SessionUser = {
        id: profile.id,
        name: profile.name,
        picture: profile.picture.data,
      };

      // Add user to the database if not already present
      try {
        await db
          .insert(usersTable)
          .values({ fbId: user.id })
          .onConflictDoNothing();
      } catch (error) {
        console.error("Error inserting user into database:", error);
      }

      return user;
    }
  ),
  "facebook"
);
