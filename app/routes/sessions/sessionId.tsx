import { Accordion } from "@mantine/core";
import { eq } from "drizzle-orm";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionCriteria } from "~/database/schema.server";

import { BeerCard } from "~/components/BeerCard";
import { BeerCardDetails } from "~/components/BeerCardDetails";
import EmptySession from "~/components/EmptySession";
import UpNext from "~/components/UpNext";

import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";

import { extractSessionId, getPageTitle } from "~/utils/utils";

import { type SessionProgress, SessionStatus } from "~/types/session";
import type { Route } from "./+types/sessionId";
import { StartSession } from "~/components/StartSession/StartSession";

export function meta() {
  return [{ title: getPageTitle("Smagning") }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params?.sessionId) {
    return redirect("/sessions");
  }

  const sessionId = extractSessionId(params.sessionId);

  const user = await userSessionGet(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const progressResponse = await fetch(
    `${origin}/api/sessions/${sessionId}/progress`,
    {
      // TODO: Do this in a better way?
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );
  const sessionProgress = (await progressResponse.json()) as SessionProgress;
  if (sessionProgress.status === SessionStatus.finished) {
    return redirect("view");
  }

  const sessionCriteriaWithDetails = await db.query.sessionCriteria.findMany({
    where: eq(sessionCriteria.sessionId, sessionId),
    with: { criterion: true },
  });
  const sessionCriteriaSimple = sessionCriteriaWithDetails
    .filter(
      (
        row
      ): row is typeof row & { criterion: NonNullable<typeof row.criterion> } =>
        row.criterion !== null
    )
    .map((row) => ({
      id: row.criterion.id,
      name: row.criterion.name,
      description: row.criterion.description,
      weight: row.criterion.weight,
    }));

  return {
    user,
    sessionProgress,
    sessionCriteriaSimple,
  };
}

export default function Session() {
  const { user, sessionProgress, sessionCriteriaSimple } =
    useLoaderData<typeof loader>();

  const { revalidate } = useRevalidator();

  const hasCurrentBeer =
    sessionProgress.status === SessionStatus.active &&
    sessionProgress.currentBeer &&
    Object.keys(sessionProgress.currentBeer).length !== 0;

  // An active session that has yet to have beers added
  const emptySession =
    sessionProgress.status === SessionStatus.active &&
    sessionProgress.ratedBeers.length === 0 &&
    !hasCurrentBeer;

  useDebouncedSocketEvent(
    [
      "sessions:created",
      "session:users-changed",
      "session:beer-changed",
      "session:vote",
    ],
    async () => revalidate(),
    sessionProgress.sessionId
  );

  return (
    <>
      {emptySession && <EmptySession />}

      {!emptySession && sessionProgress.status === SessionStatus.created && (
        <StartSession user={user} session={sessionProgress} />
      )}

      {hasCurrentBeer && (
        <UpNext
          user={user}
          session={sessionProgress}
          sessionCriteria={sessionCriteriaSimple}
          mb="xl"
        />
      )}

      <Accordion unstyled chevron={null}>
        {sessionProgress.ratedBeers.map((beer, index) => {
          const { beerId } = beer;

          return (
            <Accordion.Item
              value={beerId.toString()}
              m={0}
              mb={index === 2 ? "30px" : "8px"}
              key={beerId}
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
                  session={sessionProgress}
                  beer={beer}
                  rank={index + 1}
                />
              </Accordion.Control>

              <Accordion.Panel>
                <BeerCardDetails beer={beer} />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </>
  );
}
