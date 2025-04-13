import { Box, Button, Divider, Group, Paper, Stack, Text } from "@mantine/core";

import { calculateSingleTotalScore } from "~/utils/score";
import { createLink } from "~/utils/untappd";

import type { SelectBeer, SelectVote } from "~/database/schema.types";

type InputProps = {
  beer: SelectBeer;
  votes: SelectVote[];
};

export function BeerCardDetails({ beer, votes }: InputProps) {
  const { untappdBeerId } = beer;

  const totalScores = calculateSingleTotalScore(votes);

  return (
    <Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
      <Box px="sm">
        <Group justify="space-between">
          {totalScores.map(({ name, score }) => (
            <Stack gap={0} key={name}>
              <Text ta="center" fw={400}>
                {name}
              </Text>
              <Text ta="center" fw="bold">
                {score.toFixed(2).replace(".", ",")}
                {/* local toFixed */}
              </Text>
            </Stack>
          ))}
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
