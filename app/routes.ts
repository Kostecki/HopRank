import {
	index,
	layout,
	prefix,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	route("healthz", "routes/healthz.ts"),
	layout("routes/layout.tsx", [
		index("routes/home.tsx"),
		route("j/:joinCode", "routes/directJoin.tsx"),
		route("v/:joinCode", "routes/screenLink.tsx"),
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
			route("totp", "routes/auth/totp.tsx"),
			route("untappd", "routes/auth/untappd/index.ts"),
			route("untappd/callback", "routes/auth/untappd/callback.ts"),
		]),
	]),
	...prefix("api", [
		...prefix("sessions", [
			index("routes/api/sessions/sessions.ts"),
			route("join/:joinCode", "routes/api/sessions/session/joinByCode.ts"),
			route("unique-name", "routes/api/sessions/uniqueName.ts"),
			...prefix(":sessionId", [
				route("add", "routes/api/sessions/session/add.ts"),
				route("bars", "routes/api/sessions/session/bars.ts"),
				route("bars/:barId", "routes/api/sessions/session/bar.ts"),
				route("bars-sync", "routes/api/sessions/session/barsSync.ts"),
				route("finish", "routes/api/sessions/session/finish.ts"),
				route("join", "routes/api/sessions/session/join.ts"),
				route("kick", "routes/api/sessions/session/kick.ts"),
				route("kick-vote", "routes/api/sessions/session/kickVote.ts"),
				route("leave", "routes/api/sessions/session/leave.ts"),
				route("placements", "routes/api/sessions/session/placements.ts"),
				route("remove/:beerId", "routes/api/sessions/session/remove.ts"),
				route("start", "routes/api/sessions/session/start.ts"),
				route("vote", "routes/api/sessions/session/vote.ts"),
			]),
		]),
		...prefix("untappd", [
			route("beer/:beerId", "routes/api/untappd/$beerId.ts"),
			route("beers", "routes/api/untappd/search.ts"),
			route("check-in", "routes/api/untappd/check-in.ts"),
			route("venues", "routes/api/untappd/venues.ts"),
		]),
		...prefix("user", [route("update", "routes/api/user/update.ts")]),
	]),
] satisfies RouteConfig;
