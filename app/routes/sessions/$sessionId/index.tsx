import { redirect, useLoaderData } from "react-router";
import { eq, sql } from "drizzle-orm";
import { Accordion, Paper } from "@mantine/core";

import { db } from "~/database/config.server";
import { ratingsTable, beersTable, votesTable } from "~/database/schema.server";

import { BeerCard } from "~/components/BeerCard";
import { BeerCardDetails } from "~/components/BeerCardDetails";

import { setPageTitle } from "~/utils/utils";
import smartShuffle from "~/utils/shuffle";

import type { Route } from "../+types";
import type { SelectVote } from "~/database/schema.types";
import calculateTotalScore from "~/utils/score";
import UpNext from "~/components/UpNext";

export function meta({}: Route.MetaArgs) {
  return [{ title: setPageTitle("Smagning") }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { sessionId } = params;

  if (!sessionId) {
    console.warn("Session ID is missing");
    redirect("/sessions");
  }

  const ratingCategories = await db.select().from(ratingsTable);

  const sessionIdNumber = Number(sessionId);
  const sessionBeers = await db
    .select()
    .from(beersTable)
    .where(eq(beersTable.sessionId, sessionIdNumber));

  const sessionVotes = await db
    .select()
    .from(votesTable)
    .where(sql`json_extract(vote, '$.sessionId') = ${sessionIdNumber}`);

  const ratedIds = new Set(sessionVotes.map((v) => v.vote.beerId));
  const [ratedBeers, notRatedBeers] = sessionBeers.reduce(
    ([voted, notVoted], beer) => {
      if (ratedIds.has(beer.beerId)) {
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
  const notRatedBeersShuffled = smartShuffle(notRatedBeers);

  return {
    ratingCategories,
    sessionIdNumber,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
  };
}

const getVotesForBeer = (votes: SelectVote[], beerId: number) => {
  return votes.filter((vote) => vote.vote.beerId === beerId);
};

export default function SessionDetails() {
  const {
    ratingCategories,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
  } = useLoaderData<typeof loader>();

  const upNextBeer = notRatedBeersShuffled[0];

  return (
    <>
      <UpNext
        beer={upNextBeer}
        votes={getVotesForBeer(sessionVotes, upNextBeer.beerId)}
        mt={50}
      />

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
                  <BeerCardDetails
                    ratingCategories={ratingCategories}
                    beer={beer}
                  />
                </Paper>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </>
  );
}
