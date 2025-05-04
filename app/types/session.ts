import type { SessionUser } from "./user";

export type SessionCriteria = {
  criterionId: number;
  name: string;
  weight: number;
  averageScore: number;
};

export type RatedBeers = {
  beerId: number;
  untappdBeerId: number;
  name: string;
  breweryName: string;
  style: string;
  label: string;
  addedByUserId: number;
  order: number;
  averageScore: number;
  criteriaBreakdown: SessionCriteria[];
};

export type CurrentBeer = {
  beerId: number;
  untappdBeerId: number;
  name: string;
  breweryName: string;
  style: string;
  label: string;
  order: number;
  currentVoteCount: number;
  totalPossibleVoteCount: number;
  userRatings: Record<number, number>;
};

export type SessionProgress = {
  sessionId: number;
  sessionName: string;
  status: string | null | undefined;
  joinCode: string;
  beersTotalCount: number;
  beersRatedCount: number;
  users: SessionUser[];
  sessionCriteria: SessionCriteria[];
  currentBeer: CurrentBeer | null;
  ratedBeers: RatedBeers[];
};

export type SessionCriterion = {
  id: number;
  name: string;
  description: string;
  weight: number;
};

export const SessionStatus = {
  active: "active",
  finished: "finished",
} as const;

export const SessionBeerStatus = {
  waiting: "waiting",
  rating: "rating",
  rated: "rated",
} as const;
