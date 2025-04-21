import { useState } from "react";
import { useFetcher } from "react-router";
import { Button, Card, Flex, Image, Paper, TextInput } from "@mantine/core";
import { IconAt } from "@tabler/icons-react";
import { useForm } from "@mantine/form";

import styles from "./styles.module.css";

export default function TotpForm() {
  const [isRotating, setIsRotating] = useState(false);

  const fetcher = useFetcher();

  const handleClick = () => {
    setIsRotating(true);

    setTimeout(() => {
      setIsRotating(false);
    }, 1500);
  };

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
    },
  });

  const handleSubmit = ({ email }: typeof form.values) => {
    const formData = new FormData();
    formData.append("email", email);

    fetcher.submit(formData, {
      method: "POST",
      action: "/auth/login",
    });
  };

  return (
    <Card shadow="lg" padding="lg" radius="md">
      <Card.Section p="xl">
        <Flex justify="center" align="center" direction="column">
          <Paper
            radius="100"
            shadow="sm"
            onClick={handleClick}
            className={isRotating ? styles.rotate : ""}
            style={{ cursor: "pointer" }}
          >
            <Image src="/logo.png" height="auto" w={150} fit="contain" m="lg" />
          </Paper>
        </Flex>
      </Card.Section>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          placeholder="Indtast din email"
          leftSection={<IconAt size={16} />}
          leftSectionPointerEvents="none"
          required
          type="email"
          key={form.key("email")}
          {...form.getInputProps("email")}
        />

        <Button
          type="submit"
          color="slateIndigo"
          fullWidth
          mt="xs"
          loading={fetcher.state === "submitting"}
        >
          Fortsæt med email
        </Button>
      </form>
    </Card>
  );
}
