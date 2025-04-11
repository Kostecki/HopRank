import { Button, Divider, Flex, Rating, Text } from "@mantine/core";

import { createLink } from "~/utils/untappd";

type InputProps = {
  beer: any;
  ratingCategories: any;
};

const ScoreItem = ({
  score,
  categoryName,
}: {
  score: number;
  categoryName: string;
}) => (
  <Flex justify="space-between" align="center" mb="3">
    <Text c="gray.7" fw={600}>
      {categoryName}
    </Text>
    <Rating size="md" color="teal" value={score} />
  </Flex>
);

// TODO: Type
export function BeerCardDetails({ beer, ratingCategories }: InputProps) {
  const { beerId, scores } = beer;

  return (
    <>
      <Flex justify="space-between" direction="column" mt="5">
        {/* {scores.map((score: number, index: number) => (
          <ScoreItem
            key={index}
            score={score}
            categoryName={ratingCategories[index].name}
          />
        ))} */}
      </Flex>

      {/* <Divider opacity={0.3} my="md" /> */}

      <Button
        variant="light"
        component="a"
        href={createLink(beerId)}
        target="_blank"
        color="teal"
        fullWidth
        mt="xs"
      >
        Åben i Untappd
      </Button>
    </>
  );
}
