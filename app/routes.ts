import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home/home.tsx"),

  route("auth", "routes/auth/index.ts"),
  route("auth/login", "routes/auth/login.tsx"),
  route("auth/facebook", "routes/auth/facebook.ts"),
  route("auth/callback", "routes/auth/callback.ts"),
  route("auth/logout", "routes/auth/logout.ts"),

  route("api/beers", "./routes/api/beers.ts"),
] satisfies RouteConfig;
