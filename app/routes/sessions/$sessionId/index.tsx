import { redirect, useLoaderData } from "react-router";

import { Accordion } from "@mantine/core";
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

import { getPageTitle } from "~/utils/utils";
import smartShuffle from "~/utils/shuffle";
import {
  getBeersOrderedByScore,
  getRatedAndNotRatedBeers,
  getVotesForBeer,
} from "~/utils/votes";

import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: getPageTitle("Smagning") }];
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

  const { name: sessionName } = sessionDetails;

  // Split beers into rated and not rated
  const { ratedBeers, notRatedBeers } = getRatedAndNotRatedBeers(
    sessionBeers,
    sessionVotes,
    sessionDetails
  );

  // Calculate total score for each finifhed beer to display - ordered by score
  const ratedBeersWithScore = getBeersOrderedByScore(ratedBeers, sessionVotes);

  // Random shuffle of the remaning beers
  const notRatedBeersShuffled = smartShuffle(notRatedBeers, sessionName);

  return {
    user,
    ratings,
    sessionDetails,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
  };
}

export default function SessionDetails() {
  const {
    user,
    ratings,
    sessionDetails,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
  } = useLoaderData<typeof loader>();

  const upNextBeer = notRatedBeersShuffled[0];
  const votesNextBeer = getVotesForBeer(sessionVotes, upNextBeer?.id);

  return (
    <>
      {upNextBeer && (
        <UpNext
          beer={upNextBeer}
          votes={votesNextBeer}
          ratings={ratings}
          sessionDetails={sessionDetails}
          user={user}
          mt={50}
        />
      )}

      <Accordion unstyled chevron={false}>
        {ratedBeersWithScore.map((beer, index) => {
          const { id } = beer;
          const votesForBeer = getVotesForBeer(sessionVotes, beer.id);

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
                <BeerCard beer={beer} votes={votesForBeer} index={index} />
              </Accordion.Control>

              <Accordion.Panel>
                <BeerCardDetails beer={beer} votes={votesForBeer} />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </>
  );
}
