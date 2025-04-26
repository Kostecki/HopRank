import { Box, Chip, Divider, Group, Stack, Switch, Text } from "@mantine/core";
import type { SelectRating } from "~/database/schema.types";

type InputProps = {
  ratings: SelectRating[];
};

export default function SelectRatings({ ratings }: InputProps) {
  return (
    <>
      <Text fw="bold">Smagnings-kriterier</Text>
      <Text size="sm" c="dimmed" fs="italic">
        Vælg hvilke kriterier øllene skal bedømmes efter
      </Text>

      <Box my="xs">
        <Chip.Group>
          <Group>
            <Chip value="1" size="xs" color="slateIndigo">
              Simpel
            </Chip>
            <Chip value="2" size="xs" color="slateIndigo">
              Udvidet
            </Chip>
            <Chip value="3" size="xs" color="slateIndigo">
              Alle
            </Chip>
          </Group>
        </Chip.Group>
      </Box>

      <Divider opacity={0.5} />

      <Stack mt="md">
        {ratings.map((rating) => {
          return (
            <Switch
              key={rating.id}
              defaultChecked={rating.default}
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
