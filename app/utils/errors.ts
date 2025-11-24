import { isRouteErrorResponse } from "react-router";

export type NormalizeError = {
  status: number | null;
  code: string | null;
  title: string;
  message: string;
  devStack?: string;
};

export const ERROR_CODES = {
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMIT: "RATE_LIMIT",
  VALIDATION: "VALIDATION",
  UNEXPECTED: "UNEXPECTED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const MESSAGE_MAP: Record<ErrorCode, string> = {
  [ERROR_CODES.SESSION_NOT_FOUND]: "Smagningen blev ikke fundet",
  [ERROR_CODES.UNAUTHORIZED]: "Du har ikke adgang",
  [ERROR_CODES.RATE_LIMIT]: "For mange forespørgsler - prøv igen senere",
  [ERROR_CODES.VALIDATION]: "Noget af dataen er ugyldig",
  [ERROR_CODES.UNEXPECTED]: "En uventet fejl opstod",
};

export function messageFor(code: string): string {
  return MESSAGE_MAP[code as ErrorCode] ?? MESSAGE_MAP[ERROR_CODES.UNEXPECTED];
}

export function normalizeRouteError(
  error: unknown,
  isDev: boolean,
  isAdmin: boolean
): NormalizeError {
  let status: number | null = null;
  let code: string | null = null;
  let devStack: string | undefined;

  console.log(error);

  if (isRouteErrorResponse(error)) {
    status = error.status;

    try {
      if (typeof error.data === "object" && "errorCode" in error.data) {
        code = error.data.errorCode;
      }
    } catch {}
    if (!code && status === 404) {
      code = "NOT_FOUND";
    }
  } else if (error instanceof Error) {
    const possibleCode = (error as Error & { code?: unknown }).code;
    if (typeof possibleCode === "string") {
      code = possibleCode;
    }

    if (isDev || isAdmin) {
      console.log("isDev || isAdmin");
      devStack = error.stack;
    }
  }

  if (!code) {
    code = "UNEXPECTED";
  }

  const message = messageFor(code);
  const title =
    status === 404
      ? "404"
      : code === "UNAUTHORIZED"
        ? "Adgang nægtet"
        : code === "RATE_LIMIT"
          ? "Begrænset"
          : "Noget gik galt!";

  return { status, code, title, message, devStack };
}

export function errorJson(
  status: number,
  body: Record<string, unknown>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
