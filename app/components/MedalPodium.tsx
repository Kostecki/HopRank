import { Avatar, Card, Flex, Image, rem, Text, ThemeIcon } from "@mantine/core";

import type { RatedBeers, SessionProgress } from "~/types/session";

import { createBeerLink } from "~/utils/untappd";

type inputProps = {
  session: SessionProgress;
};

// Colors for 1st, 2nd, 3rd place: Gold, Silver, Bronze
// Ordered by podium display order: 2nd, 1st, 3rd
const placementColors = ["#BFC9D6", "#E9C46A", "#C0893A"];

export default function MedalPodium({ session }: inputProps) {
  const { ratedBeers } = session;

  // heights for podium positions
  const heights = [rem(270), rem(230), rem(230)];

  // Only take the first 3 rated beers
  const topBeers: (RatedBeers | null)[] = ratedBeers.slice(0, 3);

  // Pad with nulls if less than 3, so displayOrder mapping works
  while (topBeers.length < 3) {
    topBeers.push(null);
  }

  // Classic podium order: 2nd, 1st, 3rd
  const displayOrder = [topBeers[1], topBeers[0], topBeers[2]];
  const displayHeights = [heights[1], heights[0], heights[2]];

  const viewBeerUntappd = (untappdBeerId: number) => {
    const untappdLink = createBeerLink(untappdBeerId);
    window.open(untappdLink, "_blank");
  };

  return (
    <Flex justify="center" align="flex-end" gap="xl" aria-label="Podium">
      {displayOrder.map((beer, i) => {
        const place = i === 1 ? 1 : i === 0 ? 2 : 3;
        const bg = placementColors[i];
        const height = displayHeights[i] || rem(120);
        const addedByUserId = beer?.addedByUserId;

        const user = session.users.find((u) => u.id === addedByUserId);
        const addedByName = user?.name || "";
        const addedByAvatarURL = user?.avatarURL || null;

        return (
          <Flex
            direction="column"
            align="center"
            key={place}
            w={230}
            onClick={() => beer && viewBeerUntappd(beer.untappdBeerId)}
            style={{ cursor: beer ? "pointer" : "default" }}
          >
            <Flex
              direction="column"
              align="center"
              justify={place === 1 ? "center" : "flex-end"}
              pos="relative"
              h={height}
              w="100%"
              bdrs="md"
              pt="xl"
              pb="sm"
              bg={`linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0.08) 100%)`}
              style={{
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                overflow: "hidden",
              }}
            >
              {beer ? (
                <>
                  <Avatar
                    size={56}
                    radius={999}
                    pos="absolute"
                    src={addedByAvatarURL}
                    alt={addedByName}
                    name={addedByName}
                    bdrs="50%"
                    bd="4px solid white"
                    top={rem(-35)}
                    bg={bg}
                    style={{
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    }}
                  />

                  <Card
                    withBorder
                    shadow="sm"
                    p="xs"
                    radius="md"
                    mb="sm"
                    bg="white"
                  >
                    <Image
                      src={`${beer.label}`}
                      alt={beer.name}
                      fit="contain"
                      maw={rem(100)}
                    />
                  </Card>

                  <Text size="sm" c="gray.7">
                    {beer.breweryName}
                  </Text>

                  <Text size="md" mt={3} fw={700} ta="center">
                    {beer.name}
                  </Text>
                </>
              ) : (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  gap={6}
                  h="100%"
                  w="100%"
                  style={{
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <ThemeIcon size={46} radius="xl" variant="light" color="gray">
                    <Text fw={700} size="lg">
                      {place}
                    </Text>
                  </ThemeIcon>
                </Flex>
              )}
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
}
