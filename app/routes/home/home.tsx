import { ActionIcon, Divider, Menu } from "@mantine/core";
import { IconCirclePlus, IconCircleX, IconSettings } from "@tabler/icons-react";
import { useFetcher, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { dataWithToast } from "remix-toast";

import db from "~/database/config.server";
import {
  ratingCategoriesTable,
  sessionBeersTable,
  sessionsTable,
} from "~/database/schema.server";

import { CreateSessionAction } from "./actions";

import ActiveSession from "~/components/ActiveSession";
import NoSession from "~/components/NoSession";

import type { Route } from "./+types/home";

import { wait } from "~/utils/utils";
import { userSessionGet } from "~/auth/users.server";

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

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  const ratingCategories = await db.select().from(ratingCategoriesTable);

  const activeSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.active, true));

  const sessionBeers = await db
    .select()
    .from(sessionBeersTable)
    .where(eq(sessionBeersTable.sessionId, 1));

  const upNext = {};

  return { user, ratingCategories, activeSessions, sessionBeers, upNext };
}

export default function Home() {
  const { user, activeSessions, ratingCategories, upNext } =
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

      <Menu shadow="md" width="180">
        <Menu.Target>
          <ActionIcon
            size="xl"
            radius="xl"
            pos="fixed"
            bottom={20}
            right={20}
            color="teal"
          >
            <IconSettings size={20} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Smagning</Menu.Label>
          {/* <ModalAddBeer /> */}
          <Menu.Item leftSection={<IconCircleX size={14} />}>Afslut</Menu.Item>
          <Divider opacity={0.5} />
          <Menu.Item leftSection={<IconCirclePlus size={14} />}>
            Opret ny smagning
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
