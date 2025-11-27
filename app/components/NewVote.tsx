import {
  Avatar,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";

import type { Criterion, SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { useUntappdCheckin } from "~/hooks/useUntappdCheckin";
import { calculateVoteScore } from "~/utils/score";
import { sliderConf } from "~/utils/utils";

import RatingSlider from "./RatingSlider";
import { UntappdCheckinSection } from "./UntappdCheckinSection";

type InputProps = {
  user: SessionUser;
  session: SessionProgress;
  criteria: Criterion[];
};

export default function NewVote({ user, session, criteria }: InputProps) {
  const voteFetcher = useFetcher();
  const untappdFetcher = useFetcher();

  const { sessionId } = useParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousBeerIdRef = useRef(session.currentBeer?.beerId ?? null);

  const { defaultValue } = sliderConf();

  const userHasRated =
    Object.keys(session.currentBeer?.userRatings ?? {}).length > 0;

  const initialFormValues = useMemo(
    () =>
      criteria.reduce(
        (acc, criterion) => {
          acc[criterion.name] =
            session.currentBeer?.userRatings?.[criterion.id] ?? defaultValue;
          return acc;
        },
        {} as Record<string, number>
      ),
    [criteria, defaultValue, session.currentBeer?.userRatings]
  );

  const ratingsForm = useForm({
    initialValues: initialFormValues,
  });

  const untappd = useUntappdCheckin({
    session,
    user,
    untappdFetcher,
  });

  const handleSubmit = async (values: typeof ratingsForm.values) => {
    setIsSubmitting(true);

    try {
      untappd.submitCheckin(calculatedTotalScore);

      const vote = {
        sessionId: Number(sessionId),
        userId: user.id,
        beerId: session.currentBeer?.beerId,
        ratings: Object.entries(values).map(([name, score]) => ({
          criterionId: criteria.find((r) => r.name === name)?.id as number,
          score,
        })),
      };

      const formData = new FormData();
      formData.append("vote", JSON.stringify(vote));

      voteFetcher.submit(formData, {
        method: "POST",
        action: `/api/sessions/${sessionId}/vote`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotalScore = useMemo(() => {
    return calculateVoteScore(ratingsForm.values, criteria);
  }, [ratingsForm.values, criteria]);
  const [debouncedTotalScore] = useDebouncedValue(calculatedTotalScore, 200);

  useEffect(() => {
    const currentBeerId = session.currentBeer?.beerId ?? null;
    if (currentBeerId === previousBeerIdRef.current) {
      return;
    }

    ratingsForm.setValues(initialFormValues);
    previousBeerIdRef.current = currentBeerId;
  }, [initialFormValues, ratingsForm, session.currentBeer?.beerId]);

  return (
    <Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
      <form onSubmit={ratingsForm.onSubmit(handleSubmit)}>
        <Stack>
          {criteria.map((criterion) => (
            <RatingSlider
              key={criterion.id}
              form={ratingsForm}
              name={criterion.name}
              label={criterion.name}
            />
          ))}
        </Stack>

        <Divider my="lg" opacity={0.75} />

        {!userHasRated && user.untappd?.id && user.untappd.accessToken && (
          <UntappdCheckinSection
            isEnabled={untappd.isEnabled}
            onEnabledChange={untappd.setIsEnabled}
            includeScore={untappd.includeScore}
            onIncludeScoreChange={untappd.setIncludeScore}
            openInUntappd={untappd.openInUntappd}
            onOpenInUntappdChange={untappd.setOpenInUntappd}
            isMobile={untappd.isMobile}
            debouncedTotalScore={debouncedTotalScore}
            selectedVenue={untappd.selectedVenue}
            onSelectedVenueChange={untappd.setSelectedVenue}
            comment={untappd.comment}
            onCommentChange={untappd.setComment}
            accessToken={user.untappd.accessToken}
            location={untappd.location}
          />
        )}

        <Button
          color="slateIndigo"
          tt="uppercase"
          fw="bold"
          lts={0.8}
          fullWidth
          type="submit"
          loading={
            isSubmitting ||
            voteFetcher.state !== "idle" ||
            untappdFetcher.state !== "idle"
          }
          mb="lg"
        >
          Gem Bedømmelse {untappd.isEnabled && "og Check-in"}
        </Button>

        {userHasRated && (
          <>
            <Card shadow="xs" radius="md">
              <LoadingOverlay
                visible={
                  !userHasRated &&
                  (isSubmitting || voteFetcher.state !== "idle")
                }
                zIndex={1000}
                overlayProps={{ radius: "sm", blur: 2 }}
                loaderProps={{ color: "slateIndigo" }}
              />
              <Flex align="center">
                <Avatar
                  color="slateIndigo"
                  variant="outline"
                  size="lg"
                  radius="xl"
                >
                  <IconCheck color="#484F65" size={30} />
                </Avatar>

                <Group ml="xl" gap={3}>
                  <Text>Din bedømmelse er gemt!</Text>
                  <Text size="sm" c="dimmed">
                    Så længe der stadig bliver stemt kan du altid ændre din
                    score ved at gemme bedømmelsen igen.
                  </Text>
                </Group>
              </Flex>
            </Card>

            {untappd.checkinId && (
              <Card shadow="xs" radius="md" mt="md">
                <Flex align="center">
                  <Avatar
                    color="slateIndigo"
                    variant="outline"
                    size="lg"
                    radius="xl"
                  >
                    <IconCheck color="#484F65" size={30} />
                  </Avatar>

                  <Group ml="xl" gap={3}>
                    <Text>Dit check-in er oprettet i Untappd!</Text>
                    <Text size="sm" c="dimmed">
                      Du kan finde det i appen, eller ved at trykke på linket
                      herunder - så bliver du taget direkte til det.
                    </Text>
                  </Group>
                </Flex>

                <Button
                  variant="default"
                  color="slateIndigo"
                  fullWidth
                  mt="md"
                  radius="md"
                  onClick={untappd.openInApp}
                >
                  Se check-in i Untappd
                </Button>
              </Card>
            )}
          </>
        )}
      </form>
    </Paper>
  );
}
