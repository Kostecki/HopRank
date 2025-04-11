import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

type Vote = {
  sessionId: number;
  beerId: number;
  userId: number;
  ratings: {
    name: string;
    rating: number;
    weight: number;
  }[];
};

export const ratingsTable = sqliteTable("ratings", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  weight: real().default(1).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectRatingCategory = InferSelectModel<typeof ratingsTable>;
export type InsertRatingCategory = InferInsertModel<typeof ratingsTable>;

export const sessionsTable = sqliteTable("sessions", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  active: int({ mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectSession = InferSelectModel<typeof sessionsTable>;
export type InsertSession = InferInsertModel<typeof sessionsTable>;

export const votesTable = sqliteTable("votes", {
  id: int().primaryKey({ autoIncrement: true }),
  vote: text("vote", { mode: "json" }).$type<Vote>().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectVote = InferSelectModel<typeof votesTable>;
export type InsertVote = InferInsertModel<typeof votesTable>;

export const beersTable = sqliteTable("beers", {
  id: int().primaryKey({ autoIncrement: true }),
  addedBy: int("added_by")
    .notNull()
    .references(() => usersTable.id),
  sessionId: int("session_id")
    .notNull()
    .references(() => sessionsTable.id),
  beerId: int("beer_id").notNull(),
  name: text("name").notNull(),
  style: text("style").notNull(),
  breweryName: text("brewery_name").notNull(),
  label: text("label").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectSessionBeer = InferSelectModel<typeof beersTable>;
export type InsertSessionBeer = InferInsertModel<typeof beersTable>;

export const usersTable = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  fbId: text("fb_id").notNull().unique(),
  activeSessionId: int("active_session_id").references(() => sessionsTable.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectUser = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;
