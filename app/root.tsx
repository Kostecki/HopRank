import { useEffect } from "react";
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

import { userSessionGet } from "./auth/users.server";

import {
  showDangerToast,
  showSuccessToast,
  showWarningToast,
} from "./utils/toasts";

import { useUmamiIdentify } from "./hooks/umami";

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
  {
    rel: "icon",
    type: "image/png",
    href: "/favicon/favicon-96x96.png",
    sizes: "96x96",
  },
  {
    rel: "icon",
    type: "image/svg+xml",
    href: "/favicon/favicon.ico",
  },
  {
    rel: "shortcut icon",
    href: "/favicon/favicon.ico",
  },
  {
    rel: "apple-touch-icon",
    href: "/favicon/apple-touch-icon.png",
    sizes: "180x180",
  },
  {
    rel: "manifest",
    href: "/favicon/site.webmanifest",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await userSessionGet(request);
  const { toast, headers } = await getToast(request);

  return data({ user, toast }, { headers });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { toast } = useLoaderData<typeof loader>();

  const UmamiScript = () => {
    const isProd = import.meta.env.PROD;
    if (!isProd) return null;

    return (
      <script
        defer
        src="https://umami.israndom.win/script.js"
        data-website-id="05e5f7ee-6b31-48ad-b853-994f11cd2291"
      ></script>
    );
  };

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
        <meta name="apple-mobile-web-app-title" content="HopRank" />
        <Meta />
        <Links />
        <UmamiScript />
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
  const { user } = useLoaderData<typeof loader>();
  useUmamiIdentify(user?.email);

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
