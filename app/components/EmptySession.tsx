import { useState } from "react";
import { useFetcher, useParams } from "react-router";
import { Button, Paper, Text } from "@mantine/core";

import BeerMultiSelect from "./BeerMultiSelect";

import type { BeerOption } from "~/types/misc";

export default function EmptySession() {
  const { sessionId } = useParams();
  const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);

  const fetcher = useFetcher();

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("beers", JSON.stringify(selectedBeers));

    await fetcher.submit(formData, {
      method: "POST",
      action: `/sessions/${sessionId}/add`,
    });

    setSelectedBeers([]);
  };

  return (
    <Paper p="md" radius="md" withBorder mt={64}>
      <Text fw="bold">Smagningen har ingen øl :(</Text>
      <Text c="dimmed" size="sm" fs="italic">
        Du kan tilføje øl ved at søge efter dem herunder
      </Text>

      <BeerMultiSelect
        my="lg"
        selectedBeers={selectedBeers}
        setSelectedBeers={setSelectedBeers}
      />

      <Button
        color="teal"
        fullWidth
        radius="md"
        onClick={handleSubmit}
        disabled={!selectedBeers.length}
        loading={fetcher.state === "submitting"}
      >
        Tilføj øl til smagningen
      </Button>
    </Paper>
  );
}
