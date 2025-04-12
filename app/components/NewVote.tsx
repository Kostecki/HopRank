import { useFetcher, useParams } from "react-router";
import { Button, Divider, Paper, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";

import type {
  SelectBeer,
  SelectRating,
  SelectVote,
} from "~/database/schema.types";

import RatingSlider from "./RatingSlider";

import { sliderConf } from "~/utils/utils";
import type { SessionUser } from "~/auth/auth.server";

type InputProps = {
  ratings: SelectRating[];
  beer: SelectBeer;
  user: SessionUser;
  votes: SelectVote[];
};

export default function NewVote({ user, ratings, beer, votes }: InputProps) {
  const fetcher = useFetcher();
  const { sessionId } = useParams();

  const { defaultValue } = sliderConf;

  const getValue = (id: number) => {
    if (!votes.length) return defaultValue;

    const vote = votes.find(
      (v) =>
        v.beerId === beer.beerId &&
        v.sessionId === Number(sessionId) &&
        v.userId === user.id
    );

    const value = vote?.vote[id - 1].rating ?? defaultValue;
    return value;
  };

  const form = useForm({
    initialValues: ratings.reduce((acc, key) => {
      acc[key.name] = getValue(key.id);
      return acc;
    }, {} as Record<string, number>),
  });

  const handleSubmit = async (values: typeof form.values) => {
    const vote = {
      sessionId: Number(sessionId),
      userId: user.id,
      beerId: beer.beerId,
      ratings: Object.entries(values).map(([name, rating]) => ({
        name,
        rating,
        weight: ratings.find((r) => r.name === name)?.weight ?? 1,
      })),
    };

    const formData = new FormData();
    formData.append("vote", JSON.stringify(vote));

    await fetcher.submit(formData, {
      method: "POST",
      action: `/sessions/vote`,
    });
  };

  return (
    <Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {ratings.map((type) => (
            <RatingSlider
              key={type.id}
              form={form}
              name={type.name}
              label={type.name}
            />
          ))}
        </Stack>

        <Divider my="lg" opacity={0.75} />

        <Button
          color="teal"
          tt="uppercase"
          fw="bold"
          lts={0.8}
          fullWidth
          type="submit"
          loading={fetcher.state === "submitting"}
        >
          Gem Bedømmelse
        </Button>
      </form>
    </Paper>
  );
}
