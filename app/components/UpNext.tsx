import { Anchor, Box, Divider, Text, type BoxProps } from "@mantine/core";

import type {
  SelectBeer,
  SelectRating,
  SelectSession,
  SelectVote,
} from "~/database/schema.types";

import { BeerCard } from "./BeerCard";
import NewRating from "./NewRating";

import { createLink } from "~/utils/untappd";
import type { SessionUser } from "~/auth/auth.server";

type InputProps = {
  beer: SelectBeer;
  votes: SelectVote[];
  ratings: SelectRating[];
  sessionDetails?: SelectSession;
  user: SessionUser;
} & BoxProps;

export default function UpNext({
  beer,
  votes,
  ratings,
  sessionDetails,
  user,
  ...props
}: InputProps) {
  return (
    <Box {...props}>
      <Text fw={500} tt="uppercase" mb={5}>
        Næste Øl
      </Text>

      <Anchor href={createLink(beer.beerId)} target="_blank" underline="never">
        <BeerCard beer={beer} votes={votes} sessionDetails={sessionDetails} />
      </Anchor>

      <NewRating ratings={ratings} beer={beer} user={user} votes={votes} />

      <Divider my="lg" opacity={0.3} />
    </Box>
  );
}
