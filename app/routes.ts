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
      route(":sessionId", "routes/sessions/$sessionId/index.tsx"),
      route(":sessionId/join", "routes/sessions/$sessionId/actions/join.ts"),
    ]),
  ]),
  layout("routes/auth/layout.tsx", [
    ...prefix("auth", [
      index("routes/auth/index.ts"),
      route("login", "routes/auth/login.tsx"),
      route("logout", "routes/auth/logout.ts"),
      route("callback", "routes/auth/actions/callback.ts"),
      route("facebook", "routes/auth/actions/facebook.ts"),
    ]),
  ]),
  ...prefix("api", [route("beers", "routes/api/beers/index.ts")]),
] satisfies RouteConfig;
