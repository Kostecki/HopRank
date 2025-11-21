import { Box, Flex, Grid, Group, Paper, Table, Text } from "@mantine/core";
import { useLoaderData, useRevalidator } from "react-router";

import type { SessionProgress } from "~/types/session";
import type { Route } from "./+types/readOnly";

import MedalPodium from "~/components/MedalPodium";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";
import { createBeerLink } from "~/utils/untappd";
import { extractSessionId, getPageTitle } from "~/utils/utils";

export function meta() {
  return [{ title: getPageTitle("Smagning") }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params?.sessionId) {
    throw new Response("Session ID is required", { status: 400 });
  }

  const sessionId = extractSessionId(params.sessionId);

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const progressResponse = await fetch(
    `${origin}/api/sessions/${sessionId}/progress`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!progressResponse.ok) {
    throw new Response("Failed to fetch session progress", { status: 500 });
  }

  const sessionProgress = (await progressResponse.json()) as SessionProgress;
  return { sessionProgress };
}

const viewBeerUntappd = (untappdBeerId: number) => {
  const untappdLink = createBeerLink(untappdBeerId);
  window.open(untappdLink, "_blank");
};

export default function SessionView() {
  const { sessionProgress } = useLoaderData<typeof loader>();

  const { revalidate } = useRevalidator();

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

  const nonPodiumBeers = sessionProgress.ratedBeers.slice(3);

  const tableRows = nonPodiumBeers.map((beer, index) => {
    const beerAddedByUserId = beer.addedByUserId;
    const user = sessionProgress.users.find((u) => u.id === beerAddedByUserId);
    const addedByName = user?.name || "";

    return (
      <Table.Tr
        key={beer.name}
        onClick={() => viewBeerUntappd(beer.untappdBeerId)}
      >
        <Table.Td ta="center">{index + 4}</Table.Td>
        <Table.Td ta="center">{beer.name}</Table.Td>
        <Table.Td ta="center">{beer.breweryName}</Table.Td>
        <Table.Td ta="center">{addedByName}</Table.Td>
        <Table.Td ta="center">{beer.averageScore}</Table.Td>
      </Table.Tr>
    );
  });

  const hasRatings = sessionProgress.ratedBeers.length > 0;

  return (
    <Box data-breakout m="md" p="md">
      <MedalPodium session={sessionProgress} />

      {!hasRatings && (
        <Flex justify="center" mt="xl">
          <Paper
            withBorder
            radius="md"
            p="lg"
            mt={40}
            shadow="sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(245,245,250,0.9) 100%)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={700} size="lg">
                Ingen bedømte øl endnu
              </Text>
            </Group>
            <Text size="sm" c="gray.7" mb="md">
              Når en øl er færdigbedømt vises den her - og podiet kan begynde at
              tage form.
            </Text>
            <Group mb="xs" gap="xs">
              <Text size="xs" c="dimmed">
                {sessionProgress.beersTotalCount} øl tilføjet
              </Text>
              <Text size="xs" c="dimmed">
                •
              </Text>
              <Text size="xs" c="dimmed">
                Deltagere: {sessionProgress.users.length}
              </Text>
            </Group>
          </Paper>
        </Flex>
      )}

      {hasRatings && (
        <Grid mt={50} justify="center" gutter="xl">
          <Grid.Col span={8}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th ta="center">#</Table.Th>
                  <Table.Th ta="center">Øl</Table.Th>
                  <Table.Th ta="center">Bryggeri</Table.Th>
                  <Table.Th ta="center">Tilføjet af</Table.Th>
                  <Table.Th ta="center">Rating</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{tableRows}</Table.Tbody>
            </Table>
          </Grid.Col>
        </Grid>
      )}
    </Box>
  );
}
