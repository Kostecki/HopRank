import { data, redirect } from "react-router";

import type { Route } from "./+types/joinByCode";

import { userSessionGet } from "~/auth/users.server";
import {
  joinSessionByCode,
  SessionNotFoundError,
  SessionStateNotFoundError,
} from "~/database/utils/joinSessionByCode.server";
import { JOIN_CODE_PATTERN, normalizeJoinCode } from "~/utils/join";

export async function action({ request, params }: Route.ActionArgs) {
  const rawCode = params.joinCode;
  const joinCode = normalizeJoinCode(rawCode);

  if (!joinCode) {
    return data({ message: "Pinkoden mangler" }, { status: 400 });
  }
  if (!JOIN_CODE_PATTERN.test(joinCode)) {
    return data(
      { message: "Formatet for pinkoden er ugyldigt" },
      { status: 400 }
    );
  }

  const user = await userSessionGet(request);
  if (!user) {
    return data(
      { message: "Du skal være logget ind for at deltage" },
      { status: 401 }
    );
  }

  try {
    const result = await joinSessionByCode({ joinCode, userId: user.id });
    const sessionId = result.session.id;

    if (result.readOnly) {
      return redirect(`/sessions/${sessionId}/view`);
    }

    return redirect(`/sessions/${sessionId}`);
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return data({ message: "Pinkoden er ikke gyldig" }, { status: 404 });
    }
    if (error instanceof SessionStateNotFoundError) {
      return data({ message: "Session status mangler" }, { status: 500 });
    }
    console.error("Error joining session by code:", error);
    return data(
      {
        message:
          "Der skete en intern fejl under tilmelding. Prøv venligst igen senere.",
      },
      { status: 500 }
    );
  }
}
