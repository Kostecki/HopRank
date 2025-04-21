import { useEffect, useState } from "react";
import { redirect, useLoaderData } from "react-router";
import { Accordion, Card, Text, Title } from "@mantine/core";

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
import EmptySession from "~/components/EmptySession";

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
  const user = await userSessionGet(request);

  const requestedSessionId = Number(sessionId);

  if (!sessionId || isNaN(requestedSessionId)) {
    console.warn("Session ID is missing or invalid");
    return redirect("/sessions");
  }

  // Database data fetching
  const ratings = await getRatings();
  const sessionDetails = await getSessionDetails(requestedSessionId);
  const sessionBeers = await getSessionBeers(requestedSessionId);
  const sessionVotes = await getSessionVotes(requestedSessionId);

  const isUserInSession = user?.activeSessionId === requestedSessionId;
  const isSessionActive = sessionDetails.active;
  const mode = isUserInSession && isSessionActive ? "active" : "inactive";

  // Only allow access to the session if the user is in it or if the session is inactive
  if (user?.activeSessionId !== requestedSessionId && isSessionActive) {
    return redirect("/");
  }

  const { name: sessionName } = sessionDetails;

  // Split beers into rated and not rated
  const { ratedBeers, notRatedBeers } = getRatedAndNotRatedBeers(
    sessionBeers,
    sessionVotes,
    sessionDetails,
    mode
  );

  // Calculate total score for each finifhed beer to display - ordered by score
  const ratedBeersWithScore = getBeersOrderedByScore(ratedBeers, sessionVotes);

  // Random shuffle of the remaning beers
  const notRatedBeersShuffled = smartShuffle(notRatedBeers, sessionName);

  return {
    user,
    mode,
    ratings,
    sessionDetails,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
    sessionBeers,
  };
}

export default function SessionDetails() {
  const {
    user,
    mode,
    ratings,
    sessionDetails,
    sessionVotes,
    ratedBeersWithScore,
    notRatedBeersShuffled,
    sessionBeers,
  } = useLoaderData<typeof loader>();
  const [untappdInfoMap, setUntappdInfoMap] = useState<Map<number, any>>(
    new Map()
  );

  const [topThreeBeerIds, setTopThreeBeerIds] = useState<number[]>([]);

  const upNextBeer = notRatedBeersShuffled[0];
  const votesNextBeer = getVotesForBeer(sessionVotes, upNextBeer?.id);

  useEffect(() => {
    // Fetch beer details from Untappd API for already rated beers
    ratedBeersWithScore.forEach((beer) => {
      if (!untappdInfoMap.has(beer.id)) {
        fetch(`/api/untappd/beer/${beer.untappdBeerId}`)
          .then((res) => res.json())
          .then((data) => {
            setUntappdInfoMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(beer.id, data);
              return newMap;
            });
          })
          .catch((error) =>
            console.error("Error fetching Untappd data:", error)
          );
      }
    });

    // Set top three beers based on the scores
    const newTopThree = ratedBeersWithScore.slice(0, 3).map((beer) => beer.id);
    setTopThreeBeerIds(newTopThree);
  }, [ratedBeersWithScore]);

  return (
    <>
      {mode === "active" && (
        <>
          {!upNextBeer && ratedBeersWithScore.length === 0 && (
            <EmptySession sessionBeers={sessionBeers} />
          )}

          {upNextBeer && (
            <UpNext
              beer={upNextBeer}
              votes={votesNextBeer}
              ratings={ratings}
              sessionDetails={sessionDetails}
              user={user}
              mb="xl"
            />
          )}
        </>
      )}

      {mode === "inactive" && (
        <Card withBorder radius="md" mb="xl">
          <Title>Something with stats</Title>
          <Text size="sm" c="dimmed" mt="xs">
            Graphs and stuff?
          </Text>
        </Card>
      )}

      <Accordion unstyled chevron={false}>
        {ratedBeersWithScore.map((beer) => {
          const { id } = beer;
          const votesForBeer = getVotesForBeer(sessionVotes, beer.id);
          const podiumPosition = topThreeBeerIds.indexOf(id);

          return (
            <Accordion.Item
              value={id.toString()}
              m={0}
              mb={podiumPosition === 2 ? "26px" : "8px"}
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
                  votes={votesForBeer}
                  topThreeIds={topThreeBeerIds}
                />
              </Accordion.Control>

              <Accordion.Panel>
                <BeerCardDetails
                  beer={beer}
                  votes={votesForBeer}
                  untappdInfo={untappdInfoMap.get(beer.id)}
                />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </>
  );
}
