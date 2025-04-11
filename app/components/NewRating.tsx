import { useFetcher, useParams } from "react-router";
import { Button, Divider, LoadingOverlay, Paper, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";

import type { SelectRating, SelectSessionBeer } from "~/database/schema.types";

import RatingSlider from "./RatingSlider";

import { sliderConf, wait } from "~/utils/utils";
import type { SessionUser } from "~/auth/auth.server";

type InputProps = {
  ratings: SelectRating[];
  beer: SelectSessionBeer;
  user: SessionUser;
};

export default function NewRating({ user, ratings, beer }: InputProps) {
  const fetcher = useFetcher();
  const { sessionId } = useParams();

  const { defaultValue } = sliderConf;

  const form = useForm({
    initialValues: ratings.reduce((acc, key) => {
      acc[key.name] = defaultValue;
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

    form.reset();
  };

  return (
    <Paper p="md" radius="md" withBorder mt={-10} pt="lg" pos="relative">
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
