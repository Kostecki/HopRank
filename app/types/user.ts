import type { SelectUsers } from "~/database/schema.types";

// Base public shape we expose throughout the app (derived from the Drizzle model to stay in sync).
export type UserPublic = Pick<
  SelectUsers,
  | "id"
  | "email"
  | "admin"
  | "name"
  | "untappdId"
  | "username"
  | "avatarURL"
  | "createdAt"
  | "lastUpdatedAt"
>;

// External Untappd credential info kept separate from DB user row.
export type SessionUserUntappd = {
  id: number; // Untappd user id
  username: string;
  accessToken: string;
  name: string; // Display name from Untappd
  avatar: string;
};

// Session-scoped user view model based on the shared public shape plus optional Untappd data.
export type SessionUser = UserPublic & {
  untappd?: SessionUserUntappd;
};
