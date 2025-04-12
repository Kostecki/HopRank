import { Box, Button, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import type { SelectBeer, SelectVote } from "~/database/schema.types";

import { calculateSingleTotalScore } from "~/utils/score";
import { createLink } from "~/utils/untappd";

type InputProps = {
  beer: SelectBeer;
  votes: SelectVote[];
};

export function BeerCardDetails({ beer, votes }: InputProps) {
  const { beerId } = beer;

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
        href={createLink(beerId)}
        target="_blank"
        color="teal"
        fullWidth
        mt="xs"
      >
        Åben i Untappd
      </Button>
    </Paper>
  );
}
