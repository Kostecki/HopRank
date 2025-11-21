import type {
  SelectBeers,
  SelectCriteria,
  SelectSessions,
  SelectUsers,
} from "~/database/schema.types";

type SessionId = SelectSessions["id"];
type UserId = SelectUsers["id"];
type BeerId = SelectBeers["id"];
type CriterionId = SelectCriteria["id"];

// Individual rating entry for a criterion.
export type VoteRating = {
  criterionId: CriterionId;
  score: number;
};

// Vote payload sent from client to server when submitting ratings.
export type Vote = {
  sessionId: SessionId;
  userId: UserId;
  beerId: BeerId;
  ratings: VoteRating[];
};

export type SliderConfig = {
  stepSize: number;
  max: number;
  defaultValue: number;
  marks: { value: number }[];
};
