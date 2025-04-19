import {
  Card,
  Flex,
  Grid,
  Image,
  RingProgress,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { calculateTotalScore } from "~/utils/score";
import { displayScore } from "~/utils/utils";

import type {
  SelectBeer,
  SelectSession,
  SelectVote,
} from "~/database/schema.types";

type InputProps = {
  beer: SelectBeer;
  votes: SelectVote[];
  sessionDetails?: SelectSession;
  topThreeIds?: number[];
};

const gold = "#ffd700";
const silver = "#c0c0c0";
const bronze = "#8c6239";

export function BeerCard({
  beer,
  votes,
  sessionDetails,
  topThreeIds,
}: InputProps) {
  const { label, name, breweryName, style } = beer;

  const getMedalColor = () => {
    if (!topThreeIds) return null;

    const position = topThreeIds.indexOf(beer.id);
    if (position === -1) return null; // not top 3

    return [gold, silver, bronze][position];
  };

  const RenderTitle = () => {
    return (
      <Title size={30} fw={600} lineClamp={1} ta="center">
        {displayScore(calculateTotalScore(votes))}
      </Title>
    );
  };

  const RenderProgress = () => {
    if (!sessionDetails || !sessionDetails.userCount) return null;

    const totalPossibleVotes = sessionDetails.userCount;
    const currentNumberOfVotes = votes.length;
    const progress = (currentNumberOfVotes / totalPossibleVotes) * 100;

    return (
      <RingProgress
        size={70}
        thickness={6}
        label={
          <Text
            size="xs"
            ta="center"
            fw="600"
            style={{ pointerEvents: "none" }}
          >
            {`${currentNumberOfVotes}/${totalPossibleVotes}`}
          </Text>
        }
        sections={[
          {
            value: progress,
            color: "slateIndigo",
          },
        ]}
      />
    );
  };

  return (
    <Card
      shadow="sm"
      p="xs"
      style={{
        ...(getMedalColor()
          ? { borderLeft: `8px solid ${getMedalColor()}` }
          : {}),
        zIndex: 10,
      }}
      withBorder
    >
      <Grid justify="space-between" align="center">
        <Grid.Col span={3} p="sm">
          <Image src={label} alt={name} radius="md" mah={65} w="auto" />
        </Grid.Col>
        <Grid.Col span={6}>
          <Stack gap={0}>
            <Text size="md" ta="center" fw="bold" lineClamp={1}>
              {name}
            </Text>
            <Text size="sm" ta="center" fs="italic" lineClamp={1}>
              {breweryName}
            </Text>
            <Text size="sm" ta="center" lineClamp={1}>
              {style}
            </Text>
          </Stack>
        </Grid.Col>
        <Grid.Col span={3}>
          <Flex justify="center">
            {!sessionDetails && beer.score ? (
              <RenderTitle />
            ) : (
              <RenderProgress />
            )}
          </Flex>
        </Grid.Col>
      </Grid>
    </Card>
  );
}
