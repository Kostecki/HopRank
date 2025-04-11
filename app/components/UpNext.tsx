import { Anchor, Box, Divider, Text, type BoxProps } from "@mantine/core";

import type {
  SelectRating,
  SelectSessionBeer,
  SelectVote,
} from "~/database/schema.types";

import { BeerCard } from "./BeerCard";
import NewRating from "./NewRating";

import { createLink } from "~/utils/untappd";
import type { SessionUser } from "~/auth/auth.server";

type InputProps = {
  beer: SelectSessionBeer;
  votes: SelectVote[];
  ratings: SelectRating[];
  user: SessionUser;
} & BoxProps;

export default function UpNext({
  beer,
  votes,
  ratings,
  user,
  ...props
}: InputProps) {
  return (
    <Box {...props}>
      <Text fw={500} tt="uppercase" mb={5}>
        Næste Øl
      </Text>

      <Anchor href={createLink(beer.beerId)} target="_blank" underline="never">
        <BeerCard beer={beer} votes={votes} />
      </Anchor>

      <NewRating ratings={ratings} beer={beer} user={user} />

      <Divider my="lg" opacity={0.3} />
    </Box>
  );
}
