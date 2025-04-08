import { Box, Button, Card, Flex, Image, Text, Title } from "@mantine/core";
import { IconBrandFacebook } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  // const isProd = import.meta.env.PROD;

  return (
    <Card shadow="lg" padding="lg" radius="md">
      <Card.Section p="xl">
        <Flex justify="center" align="center" direction="column">
          <Title fw="bold" mb="xl">
            HopRank
          </Title>
          <Image
            src="/logo.png"
            height="auto"
            w={150}
            fit="contain"
            alt="Musik i Lejet logo"
          />
        </Flex>
      </Card.Section>

      <Button
        component={Link}
        to="/auth/facebook"
        color="#2463ff"
        fullWidth
        leftSection={<IconBrandFacebook size={18} />}
        mt="xs"
        loading={loading}
        onClick={() => setLoading(true)}
      >
        Log ind med Facebook
      </Button>
    </Card>
  );
}
