import { Box, Button, Divider, Stack, Text } from "@mantine/core";
import { IconDoorExit, IconPlus } from "@tabler/icons-react";
import { useFetcher, useNavigate } from "react-router";

import ModalAddBeers, { ModalAddBeersTrigger } from "./modals/ModalAddBeers";

import type { SelectBeer, SelectSession } from "~/database/schema.types";

type InputProps = {
  closeMobile: () => void;
  closeDesktop: () => void;
  sessionDetails?: SelectSession;
  sessionBeers?: SelectBeer[];
};

export default function Navbar({
  sessionDetails,
  sessionBeers,
  closeMobile,
  closeDesktop,
}: InputProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleLeaveSession = () => {
    closeMobile();
    closeDesktop();

    if (sessionDetails?.active) {
      const formData = new FormData();
      fetcher.submit(formData, {
        method: "POST",
        action: "/sessions/leave",
      });
    } else {
      navigate("/sessions");
    }
  };

  return (
    <>
      {sessionDetails && (
        <ModalAddBeers sessionBeers={sessionBeers}>
          <Box>
            <Stack gap="0">
              <Text tt="uppercase" fw={400} c="slateIndigo">
                {sessionDetails.name}
              </Text>

              <Divider opacity={0.5} mb="xs" />

              {sessionDetails.active && (
                <ModalAddBeersTrigger>
                  <Button
                    justify="flex-start"
                    variant="white"
                    leftSection={<IconPlus size={14} />}
                    color="slateIndigo"
                    fw={500}
                  >
                    Tilføj øl til smagningen
                  </Button>
                </ModalAddBeersTrigger>
              )}

              <Button
                justify="flex-start"
                variant="white"
                leftSection={<IconDoorExit size={14} />}
                color="slateIndigo"
                fw={500}
                onClick={handleLeaveSession}
              >
                {sessionDetails.active
                  ? "Forlad smagningen"
                  : "Tilbage til smagninger"}
              </Button>
            </Stack>
          </Box>
        </ModalAddBeers>
      )}
    </>
  );
}
