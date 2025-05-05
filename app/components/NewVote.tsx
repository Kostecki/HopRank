import { useEffect, useMemo, useState } from "react";
import { useFetcher, useParams } from "react-router";
import {
  Button,
  Center,
  Collapse,
  Divider,
  Grid,
  Image,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";

import RatingSlider from "./RatingSlider";
import FriendsSearch from "./FriendsSearch";

import { useGeolocation } from "~/hooks/useGeolocation";

import { sliderConf } from "~/utils/utils";
import { calculateVoteScore } from "~/utils/score";
import servingStyles from "~/servingStyles.json";

import type { SessionCriterion, SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

const CHECKIN_ENABLED = Boolean(
  JSON.parse(import.meta.env.VITE_UNTAPPD_CHECKIN)
);

type InputProps = {
  user: SessionUser;
  session: SessionProgress;
  sessionCriteria: SessionCriterion[];
};

export default function NewVote({
  user,
  session,
  sessionCriteria,
}: InputProps) {
  const fetcher = useFetcher();
  const { sessionId } = useParams();

  const [enableUntappdCheckin, setEnableUntappdCheckin] = useState(false);
  const [selectedServingStyle, setSelectedServingStyle] = useState("1");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedLocation] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  const { defaultValue } = sliderConf();

  const { location, requestLocation } = useGeolocation();

  const participantsUntappdIds = session?.users
    .map((user) => user.untappd?.id)
    .filter((id): id is number => id !== undefined);

  const form = useForm({
    initialValues: sessionCriteria.reduce((acc, key) => {
      acc[key.name] =
        session.currentBeer?.userRatings?.[key.id] ?? defaultValue;
      return acc;
    }, {} as Record<string, number>),
  });

  const handleSubmit = (values: typeof form.values) => {
    const vote = {
      sessionId: Number(sessionId),
      userId: user.id,
      beerId: session.currentBeer?.beerId,
      untappdBeerId: session.currentBeer?.untappdBeerId,
      ratings: Object.entries(values).map(([name, rating]) => ({
        id: sessionCriteria.find((r) => r.name === name)?.id,
        name,
        rating,
      })),
    };

    const formData = new FormData();
    formData.append("vote", JSON.stringify(vote));

    fetcher.submit(formData, {
      method: "POST",
      action: `/api/sessions/${sessionId}/vote`,
    });

    form.reset();

    if (enableUntappdCheckin) {
      const geolat = Number(location?.lat.toFixed(4));
      const geolng = Number(location?.lng.toFixed(4));

      const checkin = {
        bid: session.currentBeer?.untappdBeerId,
        rating: calculatedTotalScore,
        geolat,
        geolng,
        checkin_tags: selectedFriends.map((friend) => Number.parseInt(friend)),
        foursquare_id: selectedLocation,
        timezone: "Europe/Copenhagen",
        container_id: Number.parseInt(selectedServingStyle),
        gmt_offset: 2,
        shout: comment,
      };

      console.log("new checkin", checkin);
    }
  };

  const calculatedTotalScore = useMemo(() => {
    return calculateVoteScore(form.values, sessionCriteria);
  }, [form.values, sessionCriteria]);
  const [debouncedTotalScore] = useDebouncedValue(calculatedTotalScore, 200);

  useEffect(() => {
    if (enableUntappdCheckin) {
      requestLocation();
    }
  }, [enableUntappdCheckin, requestLocation]);

  return (
    <Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {sessionCriteria.map((criterion) => (
            <RatingSlider
              key={criterion.id}
              form={form}
              name={criterion.name}
              label={criterion.name}
            />
          ))}
        </Stack>

        <Divider my="lg" opacity={0.75} />

        {user.untappd?.id && user.untappd.accessToken && CHECKIN_ENABLED && (
          <>
            <Grid align="center" gutter="xs">
              <Grid.Col span={10}>
                <Stack gap="xs">
                  <Switch
                    label="Checkin på Untappd"
                    color="slateIndigo"
                    checked={enableUntappdCheckin}
                    onChange={(event) => {
                      setEnableUntappdCheckin(event.currentTarget.checked);
                    }}
                  />
                  <Text c="dimmed" size="xs">
                    Lav et checkin direkte i Untappd sammen med din bedømmelse
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={2}>
                <Text size="xl" ta="center">
                  {Number.isNaN(debouncedTotalScore)
                    ? "0.00"
                    : debouncedTotalScore.toFixed(2)}
                </Text>
                <Text c="dimmed" fs="italic" ta="center" size="sm" mt={-5}>
                  Score
                </Text>
              </Grid.Col>
            </Grid>

            <Collapse in={enableUntappdCheckin}>
              <ScrollArea type="never" offsetScrollbars scrollbarSize={4}>
                <SegmentedControl
                  mt="lg"
                  value={selectedServingStyle}
                  onChange={setSelectedServingStyle}
                  data={servingStyles.map((style) => ({
                    value: style.container_id.toString(),
                    label: (
                      <Center style={{ gap: 5 }}>
                        <Image
                          src={style.container_image_url}
                          alt={style.container_name}
                          width={20}
                          height={20}
                          ml="xs"
                        />
                        <Text size="sm" mr="md">
                          {style.container_name_dk}
                        </Text>
                      </Center>
                    ),
                  }))}
                />
              </ScrollArea>

              <FriendsSearch
                mt="sm"
                value={selectedFriends}
                onChange={setSelectedFriends}
                untappdAccessToken={user.untappd.accessToken}
                priorityUserIds={participantsUntappdIds}
              />

              <Select
                mt={5}
                placeholder="Søg efter en lokation"
                data={["React", "Angular", "Vue", "Svelte"]}
              />

              <Textarea
                mt="sm"
                label="Kommentar"
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.currentTarget.value)}
              />
            </Collapse>
          </>
        )}

        <Button
          color="slateIndigo"
          tt="uppercase"
          fw="bold"
          lts={0.8}
          fullWidth
          type="submit"
          loading={fetcher.state === "submitting"}
          mt="lg"
        >
          Gem Bedømmelse {enableUntappdCheckin && "og Checkin"}
        </Button>
      </form>
    </Paper>
  );
}
