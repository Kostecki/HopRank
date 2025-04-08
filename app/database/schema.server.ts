import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createNameId } from "mnemonic-id";

export const ratingCategoriesTable = sqliteTable("rating_categories", {
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
export type SelectRatingCategory = InferSelectModel<
  typeof ratingCategoriesTable
>;
export type InsertRatingCategory = InferInsertModel<
  typeof ratingCategoriesTable
>;

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

export const ratingsTable = sqliteTable("ratings", {
  id: int().primaryKey({ autoIncrement: true }),
  sessionId: int("session_id")
    .notNull()
    .references(() => sessionsTable.id),
  beerId: text("beer_id").notNull(),
  userId: text("user_id").notNull(),
  ratingType: int("rating_type")
    .notNull()
    .references(() => ratingCategoriesTable.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectRating = InferSelectModel<typeof ratingsTable>;
export type InsertRating = InferInsertModel<typeof ratingsTable>;

export const sessionBeersTable = sqliteTable("session_beers", {
  id: int().primaryKey({ autoIncrement: true }),
  sessionId: int("session_id")
    .notNull()
    .references(() => sessionsTable.id),
  beerId: int("beer_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
export type SelectSessionBeer = InferSelectModel<typeof sessionBeersTable>;
export type InsertSessionBeer = InferInsertModel<typeof sessionBeersTable>;

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
