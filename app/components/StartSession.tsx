import {
  Avatar,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import type { SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import dayjs from "~/utils/dayjs";
import { showDangerToast, showSuccessToast } from "~/utils/toasts";
import { capitalizeFirstLetter } from "~/utils/utils";

type InputProps = {
  user: SessionUser;
  session: SessionProgress;
};

export function StartSession({ user, session }: InputProps) {
  const [loading, setLoading] = useState(false);

  const handleStartSession = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/sessions/${session.sessionId}/start`, {
        method: "POST",
      });
      const result = await response.json();

      if (response.ok) {
        showSuccessToast("Smagning startet");
      } else {
        showDangerToast(result.message);
      }
    } catch (error) {
      showDangerToast(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="lg" padding="lg" radius="md" ta="center">
      <Stack>
        <Stack gap={0}>
          <Text size="xl" fw={500}>
            {session.sessionName}
          </Text>
          <Text c="dimmed" fs="italic" size="sm">
            {capitalizeFirstLetter(
              dayjs(session.createdAt).format("dddd [d.] D. MMMM YYYY")
            )}
          </Text>
        </Stack>
        <Stack gap={0}>
          <Text c="dimmed" size="md">
            Smagningen er endnu ikke startet
          </Text>
          <Text c="dimmed" size="md">
            Vi venter på at alle øl bliver tilføjet
          </Text>
        </Stack>

        <Group justify="center" mt="lg">
          <AnimatePresence>
            {session.users.map((user) => {
              const firstLetter = user.email.slice(0, 1).toUpperCase();

              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Group key={user.id}>
                    <Tooltip label={user.name}>
                      <Avatar
                        src={user?.avatarURL}
                        name={user.username ?? user.name ?? firstLetter}
                        color="initials"
                        size="lg"
                      />
                    </Tooltip>
                  </Group>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Group>

        {(session.createdBy === user.id || user.admin) && (
          <>
            <Divider my="xs" />
            <Button
              onClick={handleStartSession}
              variant="gradient"
              loading={loading}
            >
              Start Smagning
            </Button>
          </>
        )}
      </Stack>
    </Card>
  );
}
