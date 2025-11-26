import { Carousel } from "@mantine/carousel";
import { Box, Card, Flex, Image, rem, Text, ThemeIcon } from "@mantine/core";
import AutoPlay from "embla-carousel-autoplay";

import type { RatedBeers, SessionProgress } from "~/types/session";

import { groupRatedBeersByScore } from "~/utils/podium";
import { createBeerLink } from "~/utils/untappd";
import { displayScore } from "~/utils/utils";

type inputProps = {
  session: SessionProgress;
};

// Colors for 1st, 2nd, 3rd place: Gold, Silver, Bronze
// Ordered by podium display order: 2nd, 1st, 3rd
const placementColors = ["#BFC9D6", "#E9C46A", "#C0893A"];

export default function MedalPodium({ session }: inputProps) {
  const { ratedBeers } = session;

  // heights for podium positions in display order: 2nd, 1st, 3rd
  const heights = [rem(260), rem(290), rem(260)];

  const rankedGroups = groupRatedBeersByScore(ratedBeers);
  const podiumSource = rankedGroups.slice(0, 3);

  const podiumGroups: Array<{ score: number; beers: RatedBeers[] } | null> = [
    podiumSource[1] ?? null,
    podiumSource[0] ?? null,
    podiumSource[2] ?? null,
  ];

  const viewBeerUntappd = (untappdBeerId: number) => {
    const untappdLink = createBeerLink(untappdBeerId);
    window.open(untappdLink, "_blank");
  };

  const renderPodiumEntry = (
    beer: RatedBeers,
    place: number,
    bg: string,
    height: string
  ) => (
    <Flex
      direction="column"
      align="center"
      justify={place === 1 ? "space-between" : "flex-end"}
      pos="relative"
      h={height}
      w="100%"
      bdrs="md"
      pt="lg"
      pb="sm"
      bg={`linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0.08) 100%)`}
      style={{
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => viewBeerUntappd(beer.untappdBeerId)}
    >
      <Card withBorder shadow="sm" p="xs" radius="md" mb="sm" bg="white">
        <Image
          src={`${beer.label}`}
          alt={beer.name}
          fit="contain"
          maw={rem(100)}
        />
      </Card>
      <Box ta="center">
        <Text size="sm" c="gray.7">
          {beer.breweryName}
        </Text>

        <Text size="md" mt={3} fw={700} ta="center">
          {beer.name}
        </Text>

        <Text size="md" fw={700} mt={5} c="dimmed" fs="italic">
          {displayScore(beer.averageScore)}
        </Text>
      </Box>
    </Flex>
  );

  const renderEmptyPedestal = (place: number, bg: string, height: string) => (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={6}
      h={height}
      w="100%"
      bdrs="md"
      bg={`linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0.08) 100%)`}
      pt="lg"
      pb="sm"
      style={{
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        backdropFilter: "blur(2px)",
      }}
    >
      <ThemeIcon size={46} radius="xl" variant="light" color="gray">
        <Text fw={700} size="lg">
          {place}
        </Text>
      </ThemeIcon>
    </Flex>
  );

  return (
    <Flex justify="center" align="flex-end" gap="xl" aria-label="Podium">
      {podiumGroups.map((group, i) => {
        const place = i === 1 ? 1 : i === 0 ? 2 : 3;
        const bg = placementColors[i];
        const height = heights[i] || rem(120);

        return (
          <Flex direction="column" align="center" key={place} w={230}>
            {group ? (
              group.beers.length > 1 ? (
                <Carousel
                  withIndicators
                  withControls={false}
                  slideSize="100%"
                  slideGap="md"
                  maw="100%"
                  styles={{
                    indicator: {
                      width: 7,
                      height: 7,
                    },
                    indicators: {
                      display: "flex",
                      justifyContent: "flex-end",
                      marginRight: "15px",
                    },
                    control: {
                      backgroundColor: "unset",
                      border: "unset",
                      boxShadow: "unset",
                    },
                  }}
                  style={{ width: "100%" }}
                  emblaOptions={{
                    loop: true,
                    duration: 60,
                  }}
                  plugins={[
                    AutoPlay({
                      delay: 10000,
                      stopOnMouseEnter: true,
                      stopOnInteraction: false,
                    }),
                  ]}
                >
                  {group.beers.map((beer) => (
                    <Carousel.Slide key={beer.beerId}>
                      {renderPodiumEntry(beer, place, bg, height)}
                    </Carousel.Slide>
                  ))}
                </Carousel>
              ) : (
                renderPodiumEntry(group.beers[0], place, bg, height)
              )
            ) : (
              renderEmptyPedestal(place, bg, height)
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}
