import {
  Button,
  Code,
  ColorSchemeScript,
  Container,
  MantineProvider,
  mantineHtmlProps,
  Text,
  Title,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useEffect } from "react";
import {
  data,
  Link,
  Links,
  type LoaderFunctionArgs,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import { getToast } from "remix-toast";
import { theme } from "theme";

import { userSessionGet } from "./auth/users.server";
import { useUmamiIdentify } from "./hooks/umami";
import {
  showDangerToast,
  showSuccessToast,
  showWarningToast,
} from "./utils/toasts";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/carousel/styles.css";
import "./app.css";

import type { Route } from "./+types/root";

import { startCron } from "~/utils/cron.server";

import { normalizeRouteError } from "./utils/errors";

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
    href: "/favicon/favicon.svg",
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
  const isProd = import.meta.env.PROD;
  if (isProd) {
    startCron();
  }

  const user = await userSessionGet(request);
  const { toast, headers } = await getToast(request);

  return data({ user, toast }, { headers });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>();
  const toast = loaderData?.toast;

  const SRC_URL = import.meta.env.VITE_UMAMI_SRC_URL;
  const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;

  const UmamiScript = () => {
    const isProd = import.meta.env.PROD;
    if (!isProd || !SRC_URL || !WEBSITE_ID) return null;

    return <script defer src={SRC_URL} data-website-id={WEBSITE_ID} />;
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
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
  const rootData = useRouteLoaderData<typeof loader>("root");
  const user = rootData?.user;

  const isDev = import.meta.env.DEV;
  const isAdmin = user?.admin ?? false;
  const norm = normalizeRouteError(error, isDev, isAdmin);

  return (
    <Container style={{ textAlign: "center", paddingTop: 75 }} h="100vh">
      <Title order={1} c="black" mb="md">
        {norm.title}
      </Title>
      <Text size="xl" c="dimmed" mb="xl">
        {norm.message}
      </Text>

      {norm.devStack && (
        <pre style={{ padding: "16px", overflowX: "auto" }}>
          + <Code block>{norm.devStack}</Code>
        </pre>
      )}

      <Link to="/">
        <Button tt="uppercase" mt="md" variant="gradient">
          Tilbage til forsiden
        </Button>
      </Link>
    </Container>
  );
}
