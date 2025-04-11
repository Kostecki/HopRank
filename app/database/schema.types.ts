import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  ratingsTable,
  sessionsTable,
  beersTable,
  usersTable,
  votesTable,
} from "./schema.server";

export type SelectRatingCategory = InferSelectModel<typeof ratingsTable>;
export type InsertRatingCategory = InferInsertModel<typeof ratingsTable>;

export type SelectSession = InferSelectModel<typeof sessionsTable>;
export type InsertSession = InferInsertModel<typeof sessionsTable>;

export type SelectVote = InferSelectModel<typeof votesTable>;
export type InsertVote = InferInsertModel<typeof votesTable>;

export type SelectSessionBeer = InferSelectModel<typeof beersTable>;
export type InsertSessionBeer = InferInsertModel<typeof beersTable>;

export type SelectUser = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;
