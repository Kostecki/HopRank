import type { InferSelectModel } from "drizzle-orm";

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

export type UsersModel = InferSelectModel<typeof users>;

export type SessionsModel = InferSelectModel<typeof sessions>;

export type SessionUsersModel = InferSelectModel<typeof sessionUsers>;

export type BeersModel = InferSelectModel<typeof beers>;

export type SessionBeersModel = InferSelectModel<typeof sessionBeers>;
export type SessionBeersWithBeerModel = SessionBeersModel & {
  beer: BeersModel;
};

export type CriteriaModel = InferSelectModel<typeof criteria>;

export type SessionCriteriaModel = InferSelectModel<typeof sessionCriteria>;

export type RatingsModel = InferSelectModel<typeof ratings>;

export type SessionStateModel = InferSelectModel<typeof sessionState>;

export type PendingRedirectsModel = InferSelectModel<typeof pendingRedirects>;
