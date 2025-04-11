import { Button, Card, Divider, Flex, Image, Paper } from "@mantine/core";
import { IconBrandFacebook } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";

import styles from "./styles.module.css";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const handleClick = () => {
    setIsRotating(true);

    setTimeout(() => {
      setIsRotating(false);
    }, 1500);
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

      <Divider mb="md" opacity={0.5} />

      <Button
        component={Link}
        to="/auth/facebook"
        color="#2463FF"
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
