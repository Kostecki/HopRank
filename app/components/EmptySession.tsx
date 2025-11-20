import { Button, Paper, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useFetcher, useParams } from "react-router";

import type { BeerOption } from "~/types/misc";

import type { SelectBeers } from "~/database/schema.types";

import BeerMultiSelect from "./BeerMultiSelect";

export default function EmptySession() {
  const { sessionId } = useParams();
  const [sessionBeers, setSessionBeers] = useState<SelectBeers[]>([]);
  const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);

  const fetcher = useFetcher();

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("beers", JSON.stringify(selectedBeers));

    fetcher.submit(formData, {
      method: "POST",
      action: `/api/sessions/${sessionId}/add`,
    });

    setSelectedBeers([]);
  };

  useEffect(() => {
    const fetchBeers = async () => {
      const response = await fetch(`/api/sessions/${sessionId}/list-beers`);
      const beersList = await response.json();
      setSessionBeers(beersList);
    };

    fetchBeers();
  }, [sessionId]);

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
        sessionBeers={sessionBeers}
      />

      <Button
        color="slateIndigo"
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
