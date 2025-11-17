import { Anchor, Box, type BoxProps } from "@mantine/core";

import type { SessionCriterion, SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { createBeerLink } from "~/utils/untappd";

import { BeerCard } from "./BeerCard";
import NewVote from "./NewVote";

type InputProps = {
  user: SessionUser;
  session: SessionProgress;
  sessionCriteria: SessionCriterion[];
} & BoxProps;

export default function UpNext({
  user,
  session,
  sessionCriteria,
  ...props
}: InputProps) {
  if (!session) {
    return null;
  }

  return (
    <Box {...props}>
      <Anchor
        href={
          session.currentBeer
            ? createBeerLink(session.currentBeer.untappdBeerId)
            : "#"
        }
        target="_blank"
        underline="never"
      >
        <BeerCard session={session} />
      </Anchor>

      <NewVote
        user={user}
        session={session}
        sessionCriteria={sessionCriteria}
      />
    </Box>
  );
}
