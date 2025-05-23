import {
  Box,
  Button,
  Divider,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";
import type { RatedBeers } from "~/types/session";
import type { ScrapedBeer } from "~/types/untappd";

import { createBeerLink } from "~/utils/untappd";
import { displayScore } from "~/utils/utils";

type InputProps = {
  beer: RatedBeers;
};

export function BeerCardDetails({ beer }: InputProps) {
  const { untappdBeerId, criteriaBreakdown } = beer;

  const [fetching, setFetching] = useState(true);
  const [beerDetails, setBeerDetails] = useState<ScrapedBeer>();

  useEffect(() => {
    const fetchBeerDetails = async () => {
      setFetching(true);

      const beerDetails = await fetch(`/api/untappd/beer/${untappdBeerId}`);
      const data = (await beerDetails.json()) as ScrapedBeer;

      setTimeout(() => {
        setBeerDetails(data);
        setFetching(false);
      }, 2000);
    };

    fetchBeerDetails();
  }, [untappdBeerId]);

  return (
    <Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
      <Box px="sm" pos="relative">
        <LoadingOverlay
          visible={fetching}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ color: "slateIndigo" }}
        />
        <SimpleGrid cols={3}>
          {criteriaBreakdown.map(({ name, averageScore: score }) => (
            <Stack gap={0} align="center" key={name}>
              <Text fw={400}>{name}</Text>
              <Text fw="bold">{displayScore(score)}</Text>
            </Stack>
          ))}
        </SimpleGrid>

        <Divider opacity={0.3} my="md" />

        <SimpleGrid cols={3}>
          <Box>
            <Text ta="center" fw={400}>
              Checkins
            </Text>
            <Text ta="center" fw="bold">
              {beerDetails?.checkins.total.toLocaleString("da-DK") ?? "-"}
            </Text>
          </Box>
          <Box>
            <Text ta="center" fw={400}>
              Unkikke
            </Text>
            <Text ta="center" fw="bold">
              {beerDetails?.checkins.unique.toLocaleString("da-DK") ?? "-"}
            </Text>
          </Box>
          <Box>
            <Text ta="center" fw={400}>
              Rating
            </Text>
            <Text ta="center" fw="bold">
              {beerDetails?.rating.value ? (
                <>
                  {(
                    Math.round(
                      Number.parseFloat(beerDetails.rating.value.toString()) *
                        100
                    ) / 100
                  ).toLocaleString("da-DK")}{" "}
                  ({beerDetails?.rating.count.toLocaleString("da-DK")})
                </>
              ) : (
                "-"
              )}
            </Text>
          </Box>
        </SimpleGrid>
      </Box>

      <Button
        variant="light"
        component="a"
        href={createBeerLink(untappdBeerId)}
        target="_blank"
        color="untappd"
        fullWidth
        mt="xl"
      >
        Åben i Untappd
      </Button>
    </Paper>
  );
}
