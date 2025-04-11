import { redirect, useLoaderData } from "react-router";

import { Accordion, Paper } from "@mantine/core";
import type { SelectVote } from "~/database/schema.types";
import { userSessionGet } from "~/auth/users.server";
import {
  getRatings,
  getSessionBeers,
  getSessionDetails,
  getSessionVotes,
} from "~/database/helpers";

import { BeerCard } from "~/components/BeerCard";
import { BeerCardDetails } from "~/components/BeerCardDetails";
import UpNext from "~/components/UpNext";

import { setPageTitle } from "~/utils/utils";
import smartShuffle from "~/utils/shuffle";
import calculateTotalScore from "~/utils/score";

import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: setPageTitle("Smagning") }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { sessionId } = params;
  const sessionIdNumber = Number(sessionId);

  const user = await userSessionGet(request);

  if (!sessionId) {
    console.warn("Session ID is missing");
    redirect("/sessions");
  }

  // Database data fetching
  const ratings = await getRatings();
  const sessionDetails = await getSessionDetails(sessionIdNumber);
  const sessionBeers = await getSessionBeers(sessionIdNumber);
  const sessionVotes = await getSessionVotes(sessionIdNumber);

  // Split beers into rated and not rated
  const ratedIds = new Set(sessionVotes.map((v) => v.beerId));
  const [ratedBeers, notRatedBeers] = sessionBeers.reduce(
    ([voted, notVoted], beer) => {
      const votesForBeer = getVotesForBeer(sessionVotes, beer.beerId);
      if (
        ratedIds.has(beer.beerId) &&
        sessionDetails.userCount === votesForBeer.length
      ) {
        voted.push(beer);
      } else {
        notVoted.push(beer);
      }
      return [voted, notVoted];
    },
    [[], []] as [typeof sessionBeers, typeof sessionBeers]
  );

  // Calculate total score for each beer to display beers ordered by score
  const ratedBeersWithScore = ratedBeers
    .map((beer) => {
      const votesForBeer = getVotesForBeer(sessionVotes, beer.beerId);
      const score = calculateTotalScore(votesForBeer);

      return {
        ...beer,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Random shuffle of the not rated beers
  const notRatedBeersShuffled = smartShuffle(
    notRatedBeers,
    sessionDetails.name
  );

  return {
    user,
    ratings,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
  };
}

const getVotesForBeer = (votes: SelectVote[], beerId: number) => {
  return votes.filter((vote) => vote.beerId === beerId);
};

export default function SessionDetails() {
  const {
    user,
    ratings,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
  } = useLoaderData<typeof loader>();

  const upNextBeer = notRatedBeersShuffled[0];

  return (
    <>
      {upNextBeer && (
        <UpNext
          beer={upNextBeer}
          votes={getVotesForBeer(sessionVotes, upNextBeer.beerId)}
          ratings={ratings}
          user={user}
          mt={50}
        />
      )}

      <Accordion unstyled chevron={false}>
        {ratedBeersWithScore.map((beer, index) => {
          const { id } = beer;

          return (
            <Accordion.Item
              value={id.toString()}
              style={{ margin: `0 0 ${index == 2 ? "26px" : "8px"} 0` }}
              key={id}
            >
              <Accordion.Control
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  width: "100%",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <BeerCard
                  beer={beer}
                  votes={getVotesForBeer(sessionVotes, beer.beerId)}
                  index={index}
                />
              </Accordion.Control>

              <Accordion.Panel>
                <Paper
                  withBorder
                  bg="white"
                  style={{
                    padding: "12px 10px 10px 10px",
                    marginTop: "-8px",
                    borderBottomLeftRadius: "4px",
                    borderBottomRightRadius: "4px",
                  }}
                >
                  <BeerCardDetails ratings={ratings} beer={beer} />
                </Paper>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </>
  );
}
