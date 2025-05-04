import {
  Box,
  Button,
  PinInput,
  Stack,
  Text,
  type BoxProps,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

export default function SessionPinInput({ ...props }: BoxProps) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetcher = useFetcher();
  const fetcherBusy = fetcher.state !== "idle";

  const joinSession = async () => {
    if (!joinCode) return;

    fetcher.submit(new FormData(), {
      method: "POST",
      action: `/api/sessions/join/${joinCode}`,
    });
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.message) {
      setError(fetcher.data.message);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Box {...props}>
      <Stack align="center">
        <Text c="dimmed" size="sm" fs="italic">
          Deltag i en smagning ved at indtaste pinkoden herunder
        </Text>
        <PinInput
          value={joinCode}
          onChange={(val) => {
            setJoinCode(val.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              joinSession();
            }
          }}
          length={5}
          error={!!error}
        />
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        <Button color="slateIndigo" onClick={joinSession} loading={fetcherBusy}>
          Deltag i smagning
        </Button>
      </Stack>
    </Box>
  );
}
