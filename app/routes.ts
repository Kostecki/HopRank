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
      route("create", "routes/sessions/actions/create.ts"),
      route("vote", "routes/sessions/actions/vote.ts"),
      route("leave", "routes/sessions/actions/leave.ts"),
      route(":sessionId", "routes/sessions/$sessionId/index.tsx"),
      route(":sessionId/add", "routes/sessions/$sessionId/actions/add.ts"),
      route(":sessionId/join", "routes/sessions/$sessionId/actions/join.ts"),
    ]),
  ]),
  layout("routes/auth/layout.tsx", [
    ...prefix("auth", [
      index("routes/auth/index.ts"),
      route("login", "routes/auth/login.tsx"),
      route("logout", "routes/auth/actions/logout.ts"),
      route("callback", "routes/auth/actions/callback.ts"),
      route("facebook", "routes/auth/actions/facebook.ts"),
    ]),
  ]),
  ...prefix("api", [
    ...prefix("untappd", [
      route("beers", "routes/api/untappd/search.ts"),
      route("beer/:beerId", "routes/api/untappd/$beerId.ts"),
    ]),
  ]),
] satisfies RouteConfig;
