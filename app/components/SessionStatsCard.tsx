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
  const { lowestRater, highestRater, avgAbv, avgRating, styleStats } =
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
              <Text ta="center">
                {highestRater?.name} ({displayScore(highestRater?.avgScore)})
              </Text>
            </Box>
            <Divider opacity={0.5} />
            <Box>
              <Text ta="center" fw="bold">
                Bundscorer
              </Text>
              <Text ta="center">
                {lowestRater?.name} ({displayScore(lowestRater?.avgScore)})
              </Text>
            </Box>
          </Flex>
          <Flex justify="space-between" direction="column" h="100%">
            <Box>
              <Text ta="center" fw="bold">
                Gennemsnitsscore
              </Text>
              <Text ta="center">{displayScore(avgRating)}</Text>
            </Box>
            <Divider opacity={0.5} my="sm" />
            <Box>
              <Text ta="center" fw="bold">
                Procenter
              </Text>
              <Text ta="center">{displayABV(avgAbv)}</Text>
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
