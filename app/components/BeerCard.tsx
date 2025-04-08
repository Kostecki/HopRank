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

const gold = "#ffd700";
const silver = "#c0c0c0";
const bronze = "#8c6239";

// TODO: Type
export function BeerCard({ beer, index }: { beer: any; index?: number }) {
  const { url, label, name, brewery, style, scores } = beer;

  const getMedalColor = (index?: number) => {
    if (index === undefined || index > 2) return "transparent";

    return [gold, silver, bronze][index];
  };

  const calculateScore = (scores: number[]) => {
    // Sum array with scores and return the sum
    const avgScore =
      scores.reduce((sum, value) => sum + value, 0) / scores.length;
    return avgScore.toFixed(1);
  };

  const calculateVoteProgress = () => {
    // Calculate the progress of the votes
    const totalVotes = 5;
    const votes = 2;
    const progress = (votes / totalVotes) * 100;

    return { labelText: `${votes}/${totalVotes}`, value: progress };
  };

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
      style={{ borderLeft: `8px solid ${getMedalColor(index)}` }}
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
              {brewery}
            </Text>
            <Text size="sm" ta="center" lineClamp={1}>
              {style}
            </Text>
          </Stack>
        </Grid.Col>
        <Grid.Col span={3}>
          <Flex justify="center">
            {scores.length ? (
              <Title size="45" fw="600" lineClamp={1} ta="center">
                {calculateScore(scores)}
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
