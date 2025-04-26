import { Box, Chip, Divider, Group, Stack, Switch, Text } from "@mantine/core";
import { useState } from "react";

import type { SelectRating } from "~/database/schema.types";

type InputProps = {
  ratings: SelectRating[];
};

const ratingGroups = [
  {
    id: "simple",
    name: "Simpel",
    active: [1, 2, 3],
  },
  {
    id: "extended",
    name: "Udvidet",
    active: [1, 2, 3, 4, 5, 6],
  },
];

export default function SelectRatings({ ratings }: InputProps) {
  const [value, setValue] = useState("simple");

  const setChecked = (ratingId: number) => {
    const group = ratingGroups.find((group) => group.id === value);
    if (!group) return false;

    return group.active.includes(ratingId);
  };

  return (
    <>
      <Text fw="bold">Smagnings-kriterier</Text>
      <Text size="sm" c="dimmed" fs="italic">
        Vælg hvilke kriterier øllene skal bedømmes efter
      </Text>

      <Box my="xs">
        <Chip.Group multiple={false} value={value} onChange={setValue}>
          <Group>
            {ratingGroups.map((group) => (
              <Chip
                key={group.id}
                value={group.id}
                size="xs"
                color="slateIndigo"
              >
                {group.name}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Box>

      <Divider opacity={0.5} />

      <Stack mt="md">
        {ratings.map((rating) => {
          return (
            <Switch
              key={rating.id}
              checked={setChecked(rating.id)}
              label={rating.name}
              description={rating.description}
              color="slateIndigo"
            />
          );
        })}
      </Stack>
    </>
  );
}
