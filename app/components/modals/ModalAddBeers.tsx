import { createContext, useContext, useState } from "react";
import { useFetcher, useParams } from "react-router";
import { useDisclosure } from "@mantine/hooks";
import { Button, Modal, Stack } from "@mantine/core";

import BeerMultiSelect from "../BeerMultiSelect";

import type { SelectBeer } from "~/database/schema.types";
import type { BeerOption } from "~/types/misc";

type InputProps = {
  children: React.ReactNode;
  sessionBeers?: SelectBeer[];
};

const ModalAddBeersContext = createContext<() => void>(() => {});

export function ModalAddBeersTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const open = useContext(ModalAddBeersContext);

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      }}
    >
      {children}
    </div>
  );
}

export default function ModalAddBeers({ children, sessionBeers }: InputProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);

  const params = useParams();
  const { sessionId } = params;

  const fetcher = useFetcher();

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("beers", JSON.stringify(selectedBeers));

    await fetcher.submit(formData, {
      method: "POST",
      action: `/sessions/${sessionId}/add`,
    });

    setSelectedBeers([]);
    close();
  };

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
