import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type {
  beers,
  criteria,
  pendingRedirects,
  ratings,
  sessionBeers,
  sessionCriteria,
  sessionState,
  sessions,
  sessionUsers,
  users,
} from "./schema.server";

export type SelectUsers = InferSelectModel<typeof users>;
export type InsertUsers = InferInsertModel<typeof users>;

export type SelectSessions = InferSelectModel<typeof sessions>;
export type InsertSessions = InferInsertModel<typeof sessions>;

export type SelectSessionUsers = InferSelectModel<typeof sessionUsers>;
export type InsertSessionUsers = InferInsertModel<typeof sessionUsers>;

export type SelectBeers = InferSelectModel<typeof beers>;
export type InsertBeers = InferInsertModel<typeof beers>;

export type SelectSessionBeers = InferSelectModel<typeof sessionBeers>;
export type SelectSessionBeersWithBeer = SelectSessionBeers & {
  beer: SelectBeers;
};
export type InsertSessionBeers = InferInsertModel<typeof sessionBeers>;

export type SelectCriteria = InferSelectModel<typeof criteria>;
export type InsertCriteria = InferInsertModel<typeof criteria>;

export type SelectSessionCriteria = InferSelectModel<typeof sessionCriteria>;
export type InsertSessionCriteria = InferInsertModel<typeof sessionCriteria>;

export type SelectRatings = InferSelectModel<typeof ratings>;
export type InsertRatings = InferInsertModel<typeof ratings>;

export type SelectSessionState = InferSelectModel<typeof sessionState>;
export type InsertSessionState = InferInsertModel<typeof sessionState>;

export type SelectPendingRedirects = InferSelectModel<typeof pendingRedirects>;
export type InsertPendingRedirects = InferInsertModel<typeof pendingRedirects>;
