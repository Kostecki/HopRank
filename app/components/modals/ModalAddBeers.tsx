import { createContext, useContext, useEffect, useState } from "react";
import { useFetcher, useParams } from "react-router";
import { useDisclosure } from "@mantine/hooks";
import { Box, Button, Modal, Stack } from "@mantine/core";

import BeerMultiSelect from "../BeerMultiSelect";

import type { BeerOption } from "~/types/misc";
import type { SessionProgress } from "~/types/session";
import type {
  SelectBeers,
  SelectSessionBeersWithBeer,
} from "~/database/schema.types";

type InputProps = {
  children: React.ReactNode;
  sessionProgress?: SessionProgress;
};

const ModalAddBeersContext = createContext<() => void>(() => {});

export function ModalAddBeersTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const open = useContext(ModalAddBeersContext);

  return (
    <Box
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      }}
    >
      {children}
    </Box>
  );
}

export default function ModalAddBeers({ children }: InputProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);
  const [sessionBeers, setSessionBeers] = useState<SelectBeers[]>([]);

  const params = useParams();
  const { sessionId } = params;

  const fetcher = useFetcher();

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("beers", JSON.stringify(selectedBeers));

    fetcher.submit(formData, {
      method: "POST",
      action: `/api/sessions/${sessionId}/add`,
    });

    setSelectedBeers([]);
    close();
  };

  useEffect(() => {
    const fetchBeers = async () => {
      const response = await fetch(`/api/sessions/${sessionId}/list-beers`);
      const data = (await response.json()) as SelectSessionBeersWithBeer[];

      const beers = data.map((beer) => beer.beer);
      setSessionBeers(beers);
    };

    if (sessionId) {
      fetchBeers();
    }
  }, [sessionId]);

  return (
    <ModalAddBeersContext.Provider value={open}>
      {children}

      <Modal.Root opened={opened} onClose={close}>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header>
            <Modal.Title fw="500">Udvid smagningen</Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>
          <Modal.Body>
            <Stack mt="xs">
              <BeerMultiSelect
                selectedBeers={selectedBeers}
                setSelectedBeers={setSelectedBeers}
                sessionBeers={sessionBeers}
              />

              <Button
                color="slateIndigo"
                fullWidth
                radius="md"
                onClick={handleSubmit}
                loading={fetcher.state === "submitting"}
                disabled={selectedBeers.length === 0}
              >
                Tilføj valgte øl
              </Button>
            </Stack>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </ModalAddBeersContext.Provider>
  );
}
