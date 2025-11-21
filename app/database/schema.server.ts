import { relations, type SQL, sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  integer,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

export function lower(email: AnySQLiteColumn): SQL {
  return sql`lower(${email})`;
}

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  untappdId: integer("untappd_id"),
  name: text("name"),
  username: text("username"),
  email: text("email").notNull().unique(),
  avatarURL: text("avatar_url"),
  admin: integer({ mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastUpdatedAt: text("last_updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    joinCode: text("join_code").notNull().unique(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("unique_session_name").on(lower(table.name))]
);

export const sessionUsers = sqliteTable(
  "session_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id),
    active: integer({ mode: "boolean" }).notNull().default(false),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [unique("custom_name").on(table.sessionId, table.userId)]
);

export const beers = sqliteTable("beers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  untappdBeerId: integer("untappd_beer_id").unique().notNull(),
  name: text("name").notNull(),
  breweryName: text("brewery_name").notNull(),
  style: text("style").notNull(),
  label: text("label").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastUpdatedAt: text("last_updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessionBeers = sqliteTable("session_beers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  beerId: integer("beer_id")
    .notNull()
    .references(() => beers.id),
  addedByUserId: integer("added_by_user_id")
    .notNull()
    .references(() => users.id),
  order: integer("order"), // Not null?
  status: text({
    enum: Object.values(SessionBeerStatus) as [string, ...string[]],
  })
    .notNull()
    .default(SessionBeerStatus.waiting),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const criteria = sqliteTable("criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  description: text("description").notNull(),
  weight: real("weight").notNull(),
  enabled: integer({ mode: "boolean" }).notNull().default(true),
});

export const sessionCriteria = sqliteTable("session_criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  criterionId: integer("criterion_id")
    .notNull()
    .references(() => criteria.id),
});

export const ratings = sqliteTable(
  "ratings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id),
    beerId: integer("beer_id")
      .notNull()
      .references(() => beers.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteria.id),
    score: integer("score").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique("unique_beer_rating").on(
      table.sessionId,
      table.beerId,
      table.userId,
      table.criterionId
    ),
  ]
);

export const sessionState = sqliteTable("session_state", {
  sessionId: integer("session_id")
    .primaryKey()
    .notNull()
    .references(() => sessions.id),
  currentBeerId: integer("current_beer_id").references(() => beers.id),
  currentBeerOrder: integer("current_beer_order"),
  status: text({ enum: Object.values(SessionStatus) as [string, ...string[]] })
    .notNull()
    .default(SessionStatus.created),
  lastUpdatedAt: text("last_updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const pendingRedirects = sqliteTable("pending_redirects", {
  email: text("email").primaryKey(),
  redirectTo: text("redirect_to").notNull().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  expiresAt: integer("expires_at").notNull(),
});

// Relations
export const sessionUsersRelations = relations(sessionUsers, ({ one }) => ({
  user: one(users, {
    fields: [sessionUsers.userId],
    references: [users.id],
  }),
}));

export const sessionBeersRelations = relations(sessionBeers, ({ one }) => ({
  beer: one(beers, {
    fields: [sessionBeers.beerId],
    references: [beers.id],
  }),
}));

export const sessionCriteriaRelations = relations(
  sessionCriteria,
  ({ one }) => ({
    criterion: one(criteria, {
      fields: [sessionCriteria.criterionId],
      references: [criteria.id],
    }),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  state: one(sessionState, {
    fields: [sessions.id],
    references: [sessionState.sessionId],
  }),
}));
