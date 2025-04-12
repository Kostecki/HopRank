import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Code,
  ColorSchemeScript,
  Container,
  MantineProvider,
  ScrollArea,
  Stack,
  Text,
  Title,
  mantineHtmlProps,
} from "@mantine/core";
import { getToast } from "remix-toast";
import { Notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { eq } from "drizzle-orm";

import { db } from "./database/config.server";
import { beersTable } from "./database/schema.server";

import { userSessionGet } from "./auth/users.server";

import {
  showDangerToast,
  showSuccessToast,
  showWarningToast,
} from "./utils/toasts";

import { theme } from "theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./app.css";

import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { toast, headers } = await getToast(request);

  const user = await userSessionGet(request);

  const sessionBeers = await db
    .select()
    .from(beersTable)
    .where(eq(beersTable.sessionId, 1));
  const sessionBeerCount = sessionBeers.length;

  return data({ toast, user, sessionBeerCount }, { headers });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { toast } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (toast) {
      const { message, type, description, duration } = toast;

      if (type === "success") {
        showSuccessToast(message, description, duration);
      }

      if (type === "warning") {
        showWarningToast(message, duration);
      }

      if (type === "error") {
        showDangerToast(message, description, duration);
      }
    }
  }, [toast]);

  return (
    <html lang="en" style={{ height: "100%", margin: 0 }} {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          type="image/png"
          href="/favicon/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="HopRank" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body style={{ backgroundColor: "#FBFBFB" }}>
        <MantineProvider theme={theme}>
          {children}

          <Notifications zIndex={1000} />
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container pt={64} px="md">
      <Stack>
        <Title order={1} c="white">
          {message}
        </Title>
        <Text c="white">{details}</Text>
        {stack && (
          <ScrollArea.Autosize type="scroll" mah={600}>
            <Code block w="100%" p="md">
              {stack}
            </Code>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Container>
  );
}
