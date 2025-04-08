import { Accordion, Anchor, Divider, Stack, Text } from "@mantine/core";
import { BeerCard } from "./BeerCard";
import { ModalNewRating } from "./ModalNewRating";
import { BeerCardDetails } from "./BeerCardDetails";

import beers from "~/routes/home/beers.json"; // TODO: Only temporary

type InputProps = {
  ratingCategories: any;
  upNext: any;
};

export default function ActiveSession({
  ratingCategories,
  upNext,
}: InputProps) {
  // TODO: Only temporary. Possibly move to "get from database"-logic
  const sortedBeers = beers.sort((a, b) => {
    // Sum the scores for each beer and sort by highest score
    const sumA = a.scores.reduce((acc, score) => acc + score, 0);
    const sumB = b.scores.reduce((acc, score) => acc + score, 0);

    return sumB - sumA;
  });

  const UpNext = () => (
    <>
      <Text fw="bold" c="white" tt="uppercase" mb="-5px">
        Up Next
      </Text>

      <Anchor href={upNext.url} target="_blank" underline="never">
        <BeerCard beer={upNext} />
      </Anchor>

      <ModalNewRating ratingCategories={ratingCategories} upNextBeer={upNext} />

      <Divider my="xs" opacity={0.2} />
    </>
  );

  return (
    <Stack gap="sm">
      {/* {upNext && <UpNext />} */}

      <Accordion unstyled chevron={false}>
        {sortedBeers.map((beer, index) => {
          const { id } = beer;

          return (
            <Accordion.Item
              value={id.toString()}
              style={{ margin: `0 0 ${index == 2 ? "26px" : "8px"} 0` }}
              key={id}
            >
              <Accordion.Control
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  width: "100%",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <BeerCard beer={beer} index={index} />
              </Accordion.Control>

              <Accordion.Panel
                style={{
                  background: "white",
                  padding: "12px 10px 10px 10px",
                  marginTop: "-8px",
                  borderBottomLeftRadius: "4px",
                  borderBottomRightRadius: "4px",
                }}
              >
                <BeerCardDetails
                  ratingCategories={ratingCategories}
                  beer={beer}
                />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
