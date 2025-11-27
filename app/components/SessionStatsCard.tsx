import {
  Box,
  type BoxProps,
  Card,
  Divider,
  Flex,
  SimpleGrid,
  Text,
} from "@mantine/core";

import type { SessionStats } from "~/types/session";

import { displayABV, displayScore } from "~/utils/utils";

type InputProps = {
  sessionStats: SessionStats;
} & BoxProps;

export default function SessionStatsCard({
  sessionStats,
  ...props
}: InputProps) {
  const { lowestRaters, highestRaters, averageABV, averageRating, styleStats } =
    sessionStats;

  return (
    <Box {...props}>
      <Card shadow="xs" radius="md" mt="xl">
        <SimpleGrid cols={3}>
          <Flex justify="space-between" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Topscorer
              </Text>
              {highestRaters.map((rater) => (
                <Text ta="center" key={rater.userId}>
                  {rater.name} ({displayScore(rater.avgScore)})
                </Text>
              ))}
            </Box>
            <Divider opacity={0.5} />
            <Box>
              <Text ta="center" fw="bold">
                Bundscorer
              </Text>
              {lowestRaters.map((rater) => (
                <Text ta="center" key={rater.userId}>
                  {lowestRaters[0]?.name} (
                  {displayScore(lowestRaters[0]?.avgScore)})
                </Text>
              ))}
            </Box>
          </Flex>
          <Flex justify="space-between" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Gennemsnitsscore
              </Text>
              <Text ta="center">{displayScore(averageRating)}</Text>
            </Box>
            <Divider opacity={0.5} my="sm" />
            <Box>
              <Text ta="center" fw="bold">
                Procenter
              </Text>
              <Text ta="center">{displayABV(averageABV)}</Text>
            </Box>
          </Flex>
          <Flex justify="space-between" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Antal Stiltyper
              </Text>
              <Text ta="center">{styleStats.uniqueCount}</Text>
            </Box>
            <Divider opacity={0.5} />
            <Box>
              <Text ta="center" fw="bold">
                Mest Populære
              </Text>
              <Text ta="center">
                {styleStats.mostPopular
                  ? `${styleStats.mostPopular.style}`
                  : "N/A"}
              </Text>
            </Box>
          </Flex>
        </SimpleGrid>
      </Card>
    </Box>
  );
}
