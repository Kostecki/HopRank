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
import type {
  SelectBeer,
  SelectSession,
  SelectVote,
} from "~/database/schema.types";

import { calculateTotalScore } from "~/utils/score";

type InputProps = {
  beer: SelectBeer;
  votes: SelectVote[];
  sessionDetails?: SelectSession;
  index?: number;
};

const gold = "#ffd700";
const silver = "#c0c0c0";
const bronze = "#8c6239";

export function BeerCard({ beer, votes, sessionDetails, index }: InputProps) {
  const { label, name, breweryName, style } = beer;

  const theme = useMantineTheme();

  const getMedalColor = (index?: number) => {
    if (index === undefined || index > 2) return null;

    return [gold, silver, bronze][index];
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
        zIndex: 10,
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
            {!sessionDetails && beer.score ? (
              <Title size={45} fw={600} lineClamp={1} ta="center">
                {calculateTotalScore(votes).toFixed(2).replace(".", ",")}
                {/* local toFixed */}
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
