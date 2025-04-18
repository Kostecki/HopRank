import { calculateTotalScore } from "./score";

import type {
  SelectBeer,
  SelectSession,
  SelectVote,
} from "~/database/schema.types";

const getVotesForBeer = (votes: SelectVote[], id: number) => {
  if (!id) return [];

  const beerVotes = votes.filter((vote) => vote.beerId === id);
  return beerVotes;
};

const getRatedAndNotRatedBeers = (
  sessionBeers: SelectBeer[],
  sessionVotes: SelectVote[],
  sessionDetails: SelectSession,
  mode: "active" | "inactive"
) => {
  const ratedIds = new Set(sessionVotes.map((v) => v.beerId));

  const [ratedBeers, notRatedBeers] = sessionBeers.reduce(
    ([voted, notVoted], beer) => {
      const votesForBeer = getVotesForBeer(sessionVotes, beer.id);

      const isRatedInActiveMode =
        ratedIds.has(beer.id) &&
        sessionDetails.userCount === votesForBeer.length;

      const isRatedInInactiveMode =
        ratedIds.has(beer.id) && votesForBeer.length > 0;

      if (
        (mode === "active" && isRatedInActiveMode) ||
        (mode === "inactive" && isRatedInInactiveMode)
      ) {
        voted.push(beer);
      } else {
        notVoted.push(beer);
      }
      return [voted, notVoted];
    },
    [[], []] as [typeof sessionBeers, typeof sessionBeers]
  );

  return { ratedBeers, notRatedBeers };
};

const getBeersVotedByAllUsers = (votes: SelectVote[], userCount: number) => {
  const beerVotes = new Map<number, Set<number>>();

  votes.forEach(({ beerId, userId }) => {
    if (!beerVotes.has(beerId)) {
      beerVotes.set(beerId, new Set());
    }
    beerVotes.get(beerId)!.add(userId);
  });

  let count = 0;

  for (const voters of beerVotes.values()) {
    if (voters.size === userCount) {
      count++;
    }
  }

  return count;
};

const getBeersOrderedByScore = (
  beers: SelectBeer[],
  sessionVotes: SelectVote[]
) => {
  const beersWithScore = beers
    .map((beer) => {
      const votesForBeer = getVotesForBeer(sessionVotes, beer.id);
      const score = calculateTotalScore(votesForBeer);

      return {
        ...beer,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return beersWithScore;
};

export {
  getVotesForBeer,
  getRatedAndNotRatedBeers,
  getBeersVotedByAllUsers,
  getBeersOrderedByScore,
};
