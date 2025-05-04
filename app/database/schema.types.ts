import type { InferSelectModel } from "drizzle-orm";
import type {
  beers,
  criteria,
  ratings,
  sessionBeers,
  sessionCriteria,
  sessions,
  sessionState,
  sessionUsers,
  users,
} from "./schema.server";

export type SelectUsers = InferSelectModel<typeof users>;
export type InsertUsers = InferSelectModel<typeof users>;

export type SelectSessions = InferSelectModel<typeof sessions>;
export type InsertSessions = InferSelectModel<typeof sessions>;

export type SelectSessionUsers = InferSelectModel<typeof sessionUsers>;
export type InsertSessionUsers = InferSelectModel<typeof sessionUsers>;

export type SelectBeers = InferSelectModel<typeof beers>;
export type InsertBeers = InferSelectModel<typeof beers>;

export type SelectSessionBeers = InferSelectModel<typeof sessionBeers>;
export type InsertSessionBeers = InferSelectModel<typeof sessionBeers>;
export type SelectSessionBeersWithBeer = SelectSessionBeers & {
  beer: SelectBeers;
};

export type SelectCriteria = InferSelectModel<typeof criteria>;
export type InsertCriteria = InferSelectModel<typeof criteria>;

export type SelectSessionCriteria = InferSelectModel<typeof sessionCriteria>;
export type InsertSessionCriteria = InferSelectModel<typeof sessionCriteria>;

export type SelectRatings = InferSelectModel<typeof ratings>;
export type InsertRatings = InferSelectModel<typeof ratings>;

export type SelectSessionState = InferSelectModel<typeof sessionState>;
export type InsertSessionState = InferSelectModel<typeof sessionState>;
