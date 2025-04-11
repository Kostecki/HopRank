import { Anchor, Box, Divider, Text, type BoxProps } from "@mantine/core";

import { BeerCard } from "./BeerCard";
import type { SelectSessionBeer, SelectVote } from "~/database/schema.types";
import { createLink } from "~/utils/untappd";

type InputProps = {
  beer: SelectSessionBeer;
  votes: SelectVote[];
} & BoxProps;

export default function UpNext({ beer, votes, ...props }: InputProps) {
  return (
    <Box {...props}>
      <Text fw={500} tt="uppercase" mb={5}>
        Næste Øl
      </Text>

      <Anchor href={createLink(beer.beerId)} target="_blank" underline="never">
        <BeerCard beer={beer} votes={votes} title="Næste Øl" />
      </Anchor>

      <Divider my="lg" opacity={0.3} />
    </Box>
  );
}
