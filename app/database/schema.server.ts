import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessionStatus = {
  waiting: "waiting",
  rating: "rating",
  rated: "rated",
} as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  untappdId: integer("untappd_id"),
  email: text("email").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  status: text("status").default(sessionStatus.waiting),
});

export const sessionUsers = sqliteTable("session_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => sessions.id),
  userId: integer("user_id").references(() => users.id),
});

export const beers = sqliteTable("beers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  untappdBeerId: integer("untappd_beer_id").unique().notNull(),
  name: text("name").notNull(),
  breweryName: text("brewery_name").notNull(),
  style: text("style").notNull(),
  label_image: text("label_image").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastUpdatedAt: text("last_updated_at").$onUpdate(
    () => sql`(CURRENT_TIMESTAMP)`
  ),
});

export const sessionBeers = sqliteTable("session_beers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => sessions.id),
  beerId: integer("beer_id").references(() => beers.id),
  addedByUserId: integer("added_by_user_id").references(() => users.id),
  order: integer("order"),
  status: text("status").default(sessionStatus.waiting),
  addedAt: text("added_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const criteria = sqliteTable("criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  weight: integer("weight").notNull(),
});

export const sessionCriteria = sqliteTable("session_criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => sessions.id),
  criterionId: integer("criterion_id").references(() => criteria.id),
});

export const ratings = sqliteTable("ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => sessions.id),
  beerId: integer("beer_id").references(() => beers.id),
  userId: integer("user_id").references(() => users.id),
  criterionId: integer("criterion_id").references(() => criteria.id),
  score: integer("score").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessionState = sqliteTable("session_state", {
  sessionId: integer("session_id")
    .primaryKey()
    .references(() => sessions.id),
  currentBeerId: integer("current_beer_id").references(() => beers.id),
  currentBeerOrder: integer("current_beer_order"),
  status: text("status").default(sessionStatus.waiting),
  lastUpdatedAt: text("last_updated_at").default(sql`CURRENT_TIMESTAMP`),
});
