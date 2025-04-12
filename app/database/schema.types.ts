import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  ratingsTable,
  sessionsTable,
  beersTable,
  usersTable,
  votesTable,
} from "./schema.server";

export type SelectRating = InferSelectModel<typeof ratingsTable>;
export type InsertRating = InferInsertModel<typeof ratingsTable>;

export type SelectSession = InferSelectModel<typeof sessionsTable> & {
  userCount?: number;
};
export type InsertSession = InferInsertModel<typeof sessionsTable>;

export type SelectVote = InferSelectModel<typeof votesTable>;
export type InsertVote = InferInsertModel<typeof votesTable>;

export type SelectBeer = InferSelectModel<typeof beersTable> & {
  score?: number;
};
export type InsertBeer = InferInsertModel<typeof beersTable>;

export type SelectUser = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;
