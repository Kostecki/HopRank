import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    ...prefix("sessions", [
      index("routes/sessions/index.tsx"),
      ...prefix(":sessionId", [
        index("routes/sessions/sessionId.tsx"),
        route("view", "routes/sessions/readOnly.tsx"),
      ]),
    ]),
  ]),
  layout("routes/auth/layout.tsx", [
    ...prefix("auth", [
      index("routes/auth/index.ts"),
      route("login", "routes/auth/login.tsx"),
      route("logout", "routes/auth/logout.ts"),
      route("untappd", "routes/auth/untappd/index.ts"),
      route("untappd/callback", "routes/auth/untappd/callback.ts"),
      route("totp", "routes/auth/totp.tsx"),
    ]),
  ]),
  ...prefix("api", [
    ...prefix("sessions", [
      index("routes/api/sessions/sessions.ts"),
      route("join/:joinCode", "routes/api/sessions/session/joinByCode.ts"),
      route("unique-name", "routes/api/sessions/uniqueName.ts"),
      ...prefix(":sessionId", [
        route("add", "routes/api/sessions/session/add.ts"),
        route("list-beers", "routes/api/sessions/session/listBeers.ts"),
        route("join", "routes/api/sessions/session/join.ts"),
        route("leave", "routes/api/sessions/session/leave.ts"),
        route("progress", "routes/api/sessions/session/progress.ts"),
        route("remove/:beerId", "routes/api/sessions/session/remove.ts"),
        route("vote", "routes/api/sessions/session/vote.ts"),
      ]),
    ]),
    ...prefix("untappd", [
      route("beers", "routes/api/untappd/search.ts"),
      route("beer/:beerId", "routes/api/untappd/$beerId.ts"),
      route("venues", "routes/api/untappd/venues.ts"),
      route("check-in", "routes/api/untappd/check-in.ts"),
    ]),
    ...prefix("user", [route("update", "routes/api/user/update.ts")]),
  ]),
] satisfies RouteConfig;
