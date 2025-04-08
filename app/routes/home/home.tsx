import { ActionIcon, Divider, Menu } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useFetcher, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { dataWithToast } from "remix-toast";

import db from "~/database/config.server";
import { ratingCategoriesTable, sessionsTable } from "~/database/schema.server";

import { CreateSessionAction } from "./actions";

import ActiveSession from "~/components/ActiveSession";
import NoSession from "~/components/NoSession";

import { slateIndigo, wait } from "~/utils/utils";

import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "HopRank" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "POST") {
    const response = await CreateSessionAction(request);
    return dataWithToast(null, response);
  }
}

export async function loader() {
  const ratingCategories = await db.select().from(ratingCategoriesTable);

  const activeSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.active, true));

  const upNext = {};

  return {
    ratingCategories,
    activeSessions,
    upNext,
  };
}

export default function Home() {
  const { ratingCategories, activeSessions, upNext } =
    useLoaderData<typeof loader>();

  const [selectedBeers, setSelectedBeers] = useState<
    { value: string; label: string; brewery: string }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetcher = useFetcher();

  const handleSubmit = async () => {
    setLoading(true);

    const formData = new FormData();
    if (selectedBeers.length > 0) {
      formData.append(
        "selectedBeerIds",
        JSON.stringify(selectedBeers.map((beer) => parseInt(beer.value)))
      );
    }

    await wait(1000); // Simulate a slight delay

    fetcher.submit(formData, {
      action: ".",
      method: "POST",
    });

    setLoading(false);
  };

  return (
    <>
      {activeSessions.length > 0 ? (
        <ActiveSession ratingCategories={ratingCategories} upNext={upNext} />
      ) : (
        <NoSession
          selectedBeers={selectedBeers}
          setSelectedBeers={setSelectedBeers}
          handleSubmit={handleSubmit}
          loading={loading}
        />
      )}

      <Menu shadow="md" width="200">
        <Menu.Target>
          <ActionIcon
            size="xl"
            radius="xl"
            pos="fixed"
            bottom={20}
            right={20}
            color="white"
            variant="default"
          >
            <IconSettings color={slateIndigo} size={20} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Smagning</Menu.Label>
          {/* <ModalAddBeer /> */}
          <Menu.Item>Opret ny smagning</Menu.Item>
          <Divider opacity={0.5} />
          <Menu.Item>Afslut smagning</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
