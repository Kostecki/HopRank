import {
  Card,
  Flex,
  Grid,
  Image,
  RingProgress,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import type { SelectVote } from "~/database/schema.types";

import calculateTotalScore from "~/utils/score";

type InputProps = {
  beer: any;
  votes: SelectVote[];
  index?: number;
};

const gold = "#ffd700";
const silver = "#c0c0c0";
const bronze = "#8c6239";

const getMedalColor = (index?: number) => {
  if (index === undefined || index > 2) return null;

  return [gold, silver, bronze][index];
};

const calculateVoteProgress = () => {
  // Calculate the progress of the votes
  const totalVotes = 5;
  const votes = 2;
  const progress = (votes / totalVotes) * 100;

  return { labelText: `${votes}/${totalVotes}`, value: progress };
};

export function BeerCard({ beer, votes, index }: InputProps) {
  const { label, name, breweryName, style } = beer;

  const theme = useMantineTheme();

  const RenderProgress = () => {
    const progress = calculateVoteProgress();
    const { labelText, value } = progress;

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
            {labelText}
          </Text>
        }
        sections={[
          {
            value: value,
            color: "teal",
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
        borderLeft: `8px solid ${getMedalColor(index)}`,
      }}
      withBorder
    >
      <Grid justify="space-between" align="center">
        <Grid.Col span={2}>
          <Image src={label} alt={name} radius="md" />
        </Grid.Col>
        <Grid.Col span={7}>
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
            {beer.score ? (
              <Title size={45} fw={600} lineClamp={1} ta="center">
                {calculateTotalScore(votes).toFixed(2)}
              </Title>
            ) : (
              <RenderProgress />
            )}
          </Flex>
        </Grid.Col>
      </Grid>
    </Card>
  );
}
