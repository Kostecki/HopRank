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
  {
    id: "custom",
    name: "Brugerdefineret",
    active: [],
  },
];

export default function SelectRatings({ ratings }: InputProps) {
  const [value, setValue] = useState("simple");
  const [activeRatings, setActiveRatings] = useState<number[]>(() => {
    const group = ratingGroups.find((group) => group.id === "simple");
    return group?.active ?? [];
  });

  return (
    <>
      <Text fw="bold">Smagnings-kriterier</Text>
      <Text size="sm" c="dimmed" fs="italic">
        Vælg hvilke kriterier øllene skal bedømmes efter
      </Text>

      <Box my="xs">
        <Chip.Group
          multiple={false}
          value={value}
          onChange={(groupId) => {
            setValue(groupId);
            const group = ratingGroups.find((group) => group.id === groupId);
            if (group) {
              setActiveRatings(group.active);
            }
          }}
        >
          <Group>
            {ratingGroups
              .filter((group) => group.id !== "custom" || value === "custom")
              .map((group) => (
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
        {ratings.map((rating) => (
          <Switch
            key={rating.id}
            checked={activeRatings.includes(rating.id)}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setActiveRatings((prev) => {
                const next = checked
                  ? [...prev, rating.id]
                  : prev.filter((id) => id !== rating.id);

                const matchedGroup = ratingGroups.find((group) => {
                  if (group.id === "custom") return false;
                  return (
                    group.active.length === next.length &&
                    group.active.every((id) => next.includes(id))
                  );
                });

                if (matchedGroup) {
                  setValue(matchedGroup.id);
                } else {
                  setValue("custom");
                }

                return next;
              });
            }}
            label={rating.name}
            description={rating.description}
            color="slateIndigo"
          />
        ))}
      </Stack>
    </>
  );
}
