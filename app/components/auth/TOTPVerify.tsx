import {
  Box,
  Button,
  Card,
  Flex,
  LoadingOverlay,
  PinInput,
  Text,
  Title,
} from "@mantine/core";
import type { FetcherWithComponents } from "react-router";

type InputProps = {
  code: string;
  setCode: (code: string) => void;
  fetcher: FetcherWithComponents<any>;
  errors?: string | null | undefined;
};

export default function TOTPVerify({
  code,
  setCode,
  fetcher,
  errors,
}: InputProps) {
  const isSubmitting = fetcher.state !== "idle" || fetcher.formData != null;

  const translateError = (error: string) => {
    switch (error) {
      case "That code didn't work. Please check and try again, or request a new code.":
        return "Koden virkede ikke. Tjek og prøv igen, eller anmod om en ny kode.";
      case "We couldn't find an email to verify. Please use the same browser you started with or restart from this browser.":
        return "Vi kunne ikke finde en email at verificere. Brug den samme browser, du startede med, eller genstart fra denne browser.";
      default:
        return error;
    }
  };

  return (
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
  );
}
