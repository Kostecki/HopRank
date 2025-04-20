import { type LoaderFunction, redirect } from "react-router";
import { authenticator } from "~/auth/auth.server";
import { commitSession, getSession } from "~/auth/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  console.log("🛫 [callback] Starting Facebook authentication flow");

  try {
    const user = await authenticator.authenticate("facebook", request);

    console.log("✅ [callback] Facebook authenticate success");
    console.log("👤 [callback] Authenticated user:", JSON.stringify(user));

    const session = await getSession(request.headers.get("cookie"));
    console.log("📦 [callback] Loaded session:", session);

    session.set("user", user);

    const cookie = await commitSession(session);
    console.log("🍪 [callback] Generated Set-Cookie header:", cookie);

    console.log("🚀 [callback] Redirecting to / with Set-Cookie header...");
    return redirect("/", {
      headers: {
        "Set-Cookie": cookie,
      },
    });
  } catch (error) {
    console.error("❌ [callback] Authentication error:", error);

    if (error instanceof Response) {
      console.log(
        "🔀 [callback] Received a Response (probably a redirect), throwing it..."
      );
      throw error;
    }

    console.log("🔙 [callback] Redirecting to /auth/login because of error");
    return redirect("/auth/login");
  }
};
