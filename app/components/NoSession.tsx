import { Button, Card, Divider, Group, Stack, Text } from "@mantine/core";

import BeerMultiSelect from "./BeerMultiSelect";

type InputProps = {
  selectedBeers: { value: string; label: string; brewery: string }[];
  setSelectedBeers: (
    value: { value: string; label: string; brewery: string }[]
  ) => void;
  handleSubmit: () => void;
  loading: boolean;
};

export default function NoSession({
  selectedBeers,
  setSelectedBeers,
  handleSubmit,
  loading,
}: InputProps) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      mt="50"
      style={{ overflow: "unset" }}
    >
      <Group justify="space-between" mt="0">
        <Text fw={500}>Ingen aktive smagninger :(</Text>
      </Group>

      <Divider opacity={0.75} my="sm" />

      <Text size="sm">
        Du kan starte en ny smagning ved at trykke på knappen nedenfor.
      </Text>

      <Stack mb="lg" mt="xl" gap="xs">
        <Text size="sm" c="dimmed">
          Tilføj øl direkte til smagningen ved at vælge dem herunder
        </Text>

        <BeerMultiSelect
          selectedBeers={selectedBeers}
          setSelectedBeers={setSelectedBeers}
        />
      </Stack>

      <Divider opacity={0.5} mb="lg" />

      <Button
        color="teal"
        fullWidth
        radius="md"
        onClick={handleSubmit}
        loading={loading}
      >
        🍻 Opret ny smagning 🍻
      </Button>
    </Card>
  );
}
