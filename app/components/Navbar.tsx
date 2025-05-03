import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  List,
  Stack,
  Text,
} from "@mantine/core";
import { IconDoorExit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useFetcher, useNavigate, useRevalidator } from "react-router";

import ModalAddBeers, { ModalAddBeersTrigger } from "./modals/ModalAddBeers";
import {
  SessionBeerStatus,
  SessionStatus,
  type SessionProgress,
} from "~/types/session";
import type { SessionUser } from "~/types/user";
import type { SelectSessionBeersWithBeer } from "~/database/schema.types";

type InputProps = {
  user: SessionUser;
  sessionProgress: SessionProgress | null;
  sessionBeers: SelectSessionBeersWithBeer[];
  closeMobile: () => void;
  closeDesktop: () => void;
};

export default function Navbar({
  user,
  sessionProgress,
  sessionBeers,
  closeMobile,
  closeDesktop,
}: InputProps) {
  const { revalidate } = useRevalidator();

  const leaveFetcher = useFetcher();
  const removeFetcher = useFetcher();

  const navigate = useNavigate();

  const handleLeaveSession = () => {
    closeMobile();
    closeDesktop();

    if (sessionProgress) {
      const sessionId = sessionProgress.sessionId;

      const formData = new FormData();
      leaveFetcher.submit(formData, {
        method: "POST",
        action: `/api/sessions/${sessionId}/leave`,
      });
    } else {
      navigate("/sessions");
    }
  };

  const handleRemoveBeer = (beerId: number) => {
    const sessionId = sessionProgress?.sessionId;
    if (!sessionId) return;

    removeFetcher.submit(null, {
      action: `/api/sessions/${sessionId}/remove/${beerId}`,
    });

    revalidate();
  };

  const usersBeers = sessionBeers
    .filter((beer) => beer.addedByUserId === user?.id)
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

  const ListItem = ({ beer }: { beer: SelectSessionBeersWithBeer }) => {
    const {
      beer: { id, name, breweryName },
    } = beer;
    const isRemoving =
      removeFetcher.state !== "idle" &&
      removeFetcher.formAction?.endsWith(`/remove/${id}`);

    return (
      <Flex justify="space-between" pos="relative">
        <Stack gap={0} mb="sm">
          <Text size="sm" fw="500" lineClamp={1}>
            {name}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {breweryName}
          </Text>
        </Stack>

        <ActionIcon
          variant="subtle"
          color="slateIndigo"
          onClick={() => handleRemoveBeer(id)}
          loading={isRemoving}
          disabled={beer.status === SessionBeerStatus.rated}
        >
          <IconTrash style={{ width: "70%", height: "70%" }} stroke={1.5} />
        </ActionIcon>
      </Flex>
    );
  };

  return (
    <>
      {sessionProgress?.status === SessionStatus.active && (
        <ModalAddBeers sessionBeers={sessionProgress.ratedBeers}>
          <Box>
            <Stack gap="0">
              <Button
                justify="center"
                variant="default"
                leftSection={<IconDoorExit size={14} />}
                color="slateIndigo"
                fw={500}
                onClick={handleLeaveSession}
                mt="sm"
              >
                Forlad smagningen
              </Button>

              <Group mt="xl" justify="space-between">
                <Text size="md" tt="uppercase">
                  Dine øl
                </Text>

                <ModalAddBeersTrigger>
                  <ActionIcon variant="subtle" color="slateIndigo">
                    <IconPlus size={14} />
                  </ActionIcon>
                </ModalAddBeersTrigger>
              </Group>

              <Divider opacity={0.5} my="xs" />
              {usersBeers.length && (
                <List spacing="xs" size="sm" center>
                  {usersBeers?.map((beer) => (
                    <ListItem key={beer.beerId} beer={beer} />
                  ))}
                </List>
              )}
            </Stack>
          </Box>
        </ModalAddBeers>
      )}
    </>
  );
}
