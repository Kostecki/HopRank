import { useFetcher, useLoaderData, type MetaFunction } from "react-router";
import { useEffect, useState } from "react";
import {
  Card,
  Flex,
  Grid,
  PinInput,
  Text,
  Title,
  LoadingOverlay,
  Button,
  Box,
} from "@mantine/core";

import { getPageTitle } from "~/utils/utils";

import { loader, action } from "./actions";
export { loader, action };

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Verificér") }];
};

export default function VerifyLogin() {
  const loaderData = useLoaderData<typeof loader>();

  const [code, setCode] = useState("");

  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle" || fetcher.formData != null;

  const error = "error" in loaderData ? loaderData.error : null;
  const errors = fetcher.data?.error || error;

  const translateError = (error: string) => {
    switch (error) {
      case "That code didn't work. Please check and try again, or request a new code.":
        return "Koden virkede ikke. Tjek og prøv igen, eller anmod om en ny kode.";
      default:
        return error;
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      fetcher.submit({ code }, { method: "post" });
    }
  }, [code]);

  return (
    <Grid justify="center" pt={80}>
      <Grid.Col span={10}>
        <Card shadow="lg" padding="lg" radius="md" ta="center">
          <Card.Section p="xl">
            <Title>Verificér kode</Title>
            <Text fw={600} c="dimmed" fs="italic" mt="xs">
              En login-kode er blevet sendt til din email
            </Text>
            <Text c="dimmed" fs="italic">
              Koden er gyldig i 5 minutter
            </Text>
          </Card.Section>

          <Flex
            justify="center"
            direction="column"
            align="center"
            gap="md"
            pos="relative"
            mb="sm"
          >
            <LoadingOverlay
              visible={isSubmitting}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 1 }}
              loaderProps={{ color: "slateIndigo" }}
            />
            <fetcher.Form method="post">
              <PinInput
                value={code}
                onChange={(val) => setCode(val)}
                length={6}
                placeholder=""
                type="number"
                oneTimeCode
                disabled={isSubmitting}
                name="code"
              />
            </fetcher.Form>

            {errors && (
              <Text mt="xl" fs="italic" c="red">
                {translateError(errors)}
              </Text>
            )}

            <Box mt="lg">
              <Text c="dimmed" mb="sm">
                Har du ikke modtaget en kode?
              </Text>
              <fetcher.Form
                method="POST"
                action="/auth/login"
                autoComplete="off"
                className="flex w-full flex-col"
              >
                <Button type="submit" variant="subtle" color="slateIndigo">
                  Få en ny kode
                </Button>
              </fetcher.Form>
            </Box>
          </Flex>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
