import { useState } from "react";
import { useFetcher } from "react-router";
import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";

import { sliderConf, wait } from "~/utils/utils";
import RatingSlider from "./RatingSlider";

type InputProps = {
  ratingCategories: {
    id: number;
    name: string;
    weight: number;
  }[];
  upNextBeer: {
    label: string;
    name: string;
    brewery: string;
    style: string;
  };
};

// TODO: Type
export function ModalNewRating({ upNextBeer, ratingCategories }: InputProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  const { label, name, brewery, style } = upNextBeer;
  const { max } = sliderConf;

  const fetcher = useFetcher();

  const form = useForm({
    // Initialize the form with dynamic initial values for each rating type
    initialValues: ratingCategories.reduce((acc, key) => {
      acc[key.name] = max / 2;
      return acc;
    }, {} as Record<string, number>),
  });

  const BeerDetails = () => {
    return (
      <Grid justify="space-between" align="center">
        <Grid.Col span={3}>
          <Flex h="100%">
            <img
              src={label}
              alt={name}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
              }}
            />
          </Flex>
        </Grid.Col>
        <Grid.Col span={9}>
          <Text size="md" c="gray.7" fw="bold">
            {name}
          </Text>
          <Text size="sm" c="gray.7">
            {brewery}
          </Text>
          <Text size="sm" c="gray.7">
            {style}
          </Text>
        </Grid.Col>
      </Grid>
    );
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    fetcher.submit(formData, { method: "post", action: "." });

    await wait(1000); // Simulate a slight delay
    setLoading(false);
  };

  return (
    <>
      <Button color="teal" tt="uppercase" fw="bold" lts={0.8} onClick={open}>
        Giv Bedømmelse
      </Button>

      <Modal opened={opened} onClose={close} title="GIV BEDØMMELSE">
        <BeerDetails />
        <Divider my="lg" opacity={0.75} />
        <Box>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              {ratingCategories.map((type) => (
                <RatingSlider
                  key={type.id}
                  form={form}
                  name={type.name}
                  label={type.name}
                />
              ))}
            </Stack>

            <Divider my="lg" opacity={0.75} />

            <Button
              color="teal"
              tt="uppercase"
              fw="bold"
              lts={0.8}
              fullWidth
              type="submit"
              loading={loading}
            >
              Gem Bedømmelse
            </Button>
          </form>
        </Box>
      </Modal>
    </>
  );
}
