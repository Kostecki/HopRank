import { Button, Stack, Text } from "@mantine/core";

import BeerMultiSelect from "./BeerMultiSelect";
import { useState } from "react";
import { useFetcher } from "react-router";

type BeerOption = {
  beerId: string;
  name: string;
  style: string;
  breweryName: string;
  label: string;
};

export default function NewSession() {
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
    <>
      <Text fw="bold">Ny smagning</Text>

      <Stack>
        <Text size="sm" c="dimmed" fs="italic">
          Du kan tilføje øl til en ny smagning ved at finde dem herunder
        </Text>

        <BeerMultiSelect
          selectedBeers={selectedBeers}
          setSelectedBeers={setSelectedBeers}
        />

        <Button color="teal" fullWidth radius="md" onClick={handleSubmit}>
          Opret ny smagning
        </Button>
      </Stack>
    </>
  );
}
