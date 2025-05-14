import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Divider,
  Flex,
  Group,
  List,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconDoorExit,
  IconExternalLink,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Link, useFetcher, useNavigate, useRevalidator } from "react-router";

import ModalAddBeers, { ModalAddBeersTrigger } from "./modals/ModalAddBeers";

import type { SelectSessionBeersWithBeer } from "~/database/schema.types";

import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";

import { createProfileLink } from "~/utils/untappd";

import {
  SessionBeerStatus,
  SessionStatus,
  type SessionProgress,
  type SessionProgressUser,
} from "~/types/session";
import type { SessionUser } from "~/types/user";

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

  const UserListItem = ({ user }: { user: SessionProgressUser }) => (
    <Flex justify="space-between" pos="relative" align="center" h={25}>
      <Text size="sm" fw="500" lineClamp={1}>
        {user.name ?? user.email}
      </Text>

      {user.untappdId && user.username && (
        <Tooltip label="Se Untappd-profil" position="bottom">
          <ActionIcon
            component={Link}
            variant="subtle"
            color="slateIndigo"
            to={createProfileLink(user.username)}
            target="_blank"
          >
            <IconExternalLink size={16} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      )}
    </Flex>
  );

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

  useDebouncedSocketEvent(
    ["session:users-changed"],
    () => revalidate(),
    sessionProgress?.sessionId
  );

  return (
    <>
      {sessionProgress?.status === SessionStatus.active && (
        <ModalAddBeers sessionProgress={sessionProgress}>
          <Box>
            <Stack gap="0">
              <Text ta="center" fw={500}>
                {sessionProgress.sessionName}
              </Text>
              <CopyButton value={sessionProgress.joinCode}>
                {({ copied, copy }) => (
                  <Tooltip label="Kopier kode" position="bottom">
                    <Button color="slateIndigo" variant="white" onClick={copy}>
                      {copied ? "Kopieret" : sessionProgress.joinCode}
                    </Button>
                  </Tooltip>
                )}
              </CopyButton>
              <Divider my="sm" mb="lg" opacity={0.5} />
              <Button
                justify="center"
                variant="default"
                leftSection={<IconDoorExit size={14} />}
                color="slateIndigo"
                fw={500}
                onClick={handleLeaveSession}
              >
                Forlad smagningen
              </Button>
              <Group mt="xl" justify="space-between">
                <Text size="md" tt="uppercase">
                  Deltagere
                </Text>
              </Group>

              <Divider opacity={0.5} my="xs" />

              <List spacing="xs" size="sm">
                {sessionProgress.users.map((user) => (
                  <UserListItem key={user.id} user={user} />
                ))}
              </List>
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
              {usersBeers.length > 0 && (
                <List spacing="xs" size="sm">
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
