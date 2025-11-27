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

import AnimatedValue from "./AnimatedValue";

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
          <Flex justify="space-around" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Topscorer
              </Text>
              {highestRaters.map((rater) => {
                const compositeKey = `${rater.userId}-${rater.avgScore}`;

                return (
                  <AnimatedValue
                    key={compositeKey}
                    value={compositeKey}
                    ta="center"
                  >
                    {rater.name} ({displayScore(rater.avgScore)})
                  </AnimatedValue>
                );
              })}
            </Box>
            <Divider opacity={0.5} my="md" />
            <Box>
              <Text ta="center" fw="bold">
                Bundscorer
              </Text>
              {lowestRaters.map((rater) => {
                const compositeKey = `${rater.userId}-${rater.avgScore}`;

                return (
                  <AnimatedValue
                    key={compositeKey}
                    value={compositeKey}
                    ta="center"
                  >
                    {rater.name} ({displayScore(rater.avgScore)})
                  </AnimatedValue>
                );
              })}
            </Box>
          </Flex>
          <Flex justify="space-around" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Gennemsnitsscore
              </Text>
              <AnimatedValue value={averageRating} ta="center">
                {displayScore(averageRating)}
              </AnimatedValue>
            </Box>
            <Divider opacity={0.5} my="md" />
            <Box>
              <Text ta="center" fw="bold">
                Procenter
              </Text>
              <AnimatedValue value={averageABV} ta="center">
                {displayABV(averageABV)}
              </AnimatedValue>
            </Box>
          </Flex>
          <Flex justify="space-around" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Antal Stiltyper
              </Text>
              <AnimatedValue value={styleStats.uniqueCount} ta="center">
                {styleStats.uniqueCount}
              </AnimatedValue>
            </Box>
            <Divider opacity={0.5} my="md" />
            <Box>
              <Text ta="center" fw="bold">
                Mest Populære
              </Text>
              <AnimatedValue
                value={styleStats.mostPopular?.style || "N/A"}
                ta="center"
              >
                {styleStats.mostPopular
                  ? `${styleStats.mostPopular.style}`
                  : "N/A"}
              </AnimatedValue>
            </Box>
          </Flex>
        </SimpleGrid>
      </Card>
    </Box>
  );
}
