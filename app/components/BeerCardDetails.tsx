import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";

import { calculateSingleTotalScore } from "~/utils/score";
import { createLink } from "~/utils/untappd";
import { displayScore } from "~/utils/utils";

import type { SelectBeer, SelectVote } from "~/database/schema.types";

type InputProps = {
  beer: SelectBeer;
  votes: SelectVote[];
  untappdInfo: any;
};

export function BeerCardDetails({ beer, votes, untappdInfo }: InputProps) {
  const { untappdBeerId } = beer;

  const totalScores = calculateSingleTotalScore(votes);

  return (
    <Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
      <Box px="sm">
        <SimpleGrid cols={3}>
          {totalScores.map(({ name, score }) => (
            <Stack gap={0} align="center" key={name}>
              <Text fw={400}>{name}</Text>
              <Text fw="bold">{displayScore(score)}</Text>
            </Stack>
          ))}
        </SimpleGrid>

        <Divider opacity={0.3} my="md" />

        <Group justify="space-between">
          <Stack gap={0}>
            <Text ta="center" fw={400}>
              ABV
            </Text>
            <Text ta="center" fw="bold">
              {untappdInfo?.abv}%
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text ta="center" fw={400}>
              Total
            </Text>
            <Text ta="center" fw="bold">
              {untappdInfo?.checkins.total.toLocaleString("da-DK")}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text ta="center" fw={400}>
              Unkikke
            </Text>
            <Text ta="center" fw="bold">
              {untappdInfo?.checkins.unique.toLocaleString("da-DK")}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text ta="center" fw={400}>
              Rating
            </Text>
            <Text ta="center" fw="bold">
              {(
                Math.round(parseFloat(untappdInfo?.rating.value) * 100) / 100
              ).toLocaleString("da-DK")}{" "}
              ({untappdInfo?.rating.count.toLocaleString("da-DK")})
            </Text>
          </Stack>
        </Group>
      </Box>

      <Divider opacity={0.3} my="md" />

      <Button
        variant="light"
        component="a"
        href={createLink(untappdBeerId)}
        target="_blank"
        color="slateIndigo"
        fullWidth
        mt="xs"
      >
        Åben i Untappd
      </Button>
    </Paper>
  );
}
