import { useState } from "react";
import { useFetcher } from "react-router";
import { Box, Button, Stack, Text, type BoxProps } from "@mantine/core";

import BeerMultiSelect from "./BeerMultiSelect";

import type { BeerOption } from "~/types/misc";
import SelectRatings from "./SelectRatings";
import type { SelectRating } from "~/database/schema.types";

type InputProps = {
  ratings: SelectRating[];
} & BoxProps;

export default function NewSession({ ratings, ...props }: InputProps) {
  const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);

  const fetcher = useFetcher();

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("beers", JSON.stringify(selectedBeers));

    await fetcher.submit(formData, {
      method: "POST",
      action: "/sessions/create",
    });
  };

  return (
    <Box {...props}>
      <Text fw="bold">Ny smagning</Text>

      <Stack>
        <Text size="sm" c="dimmed" fs="italic">
          Du kan tilføje øl til en ny smagning ved at søge efter dem herunder
        </Text>

        <BeerMultiSelect
          selectedBeers={selectedBeers}
          setSelectedBeers={setSelectedBeers}
        />

        <Stack gap={0} mt="sm">
          <SelectRatings ratings={ratings} />
        </Stack>

        <Button
          color="slateIndigo"
          fullWidth
          radius="md"
          onClick={handleSubmit}
          mt="md"
        >
          🍻 Opret ny smagning 🍻
        </Button>
      </Stack>
    </Box>
  );
}
