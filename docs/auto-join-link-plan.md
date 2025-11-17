# Direct “Auto-Join” Link Feature Plan

## Goal Overview
Provide a direct URL containing the session join code that, when visited, automatically joins the user to the session (if authenticated) and redirects to the session page; if not authenticated, it defers join until after login.

## Recommended Approach
Introduce a normal (non-API) GET route that performs the join inside its loader. Keep existing POST action `/api/sessions/join/:joinCode` for explicit form submissions; the new route is for one‑click links.

## Route Design
**Option A (namespaced)**  
Path: `/sessions/j/:joinCode`  
Add to `app/routes.ts`: `route("j/:joinCode", "routes/sessions/directJoin.tsx")`  
Resulting share link: `https://yourdomain/sessions/j/ABC123`

**Option B (short global)**  
Path: `/j/:joinCode`  
Added at top level for shorter links.  
Tradeoff: Less semantic, more share‑friendly.

## Loader Logic (Pseudo)
1. Extract and validate `joinCode` (e.g. `/^[A-Z0-9]{4,10}$/`).
2. `userSessionGet(request)` for current user.
3. If unauthenticated: redirect to login with `next=/sessions/j/{code}`.
4. Lookup session by join code. If missing: 404.
5. If session finished: redirect to `/sessions/{id}/view`.
6. Check if user already joined; if not, insert via existing utility.
7. Emit websocket events.
8. Redirect to `/sessions/{id}`.

## Component File
`app/routes/sessions/directJoin.tsx` (or `joinAuto.tsx`):  
- Loader handles all logic.  
- Component only renders a lightweight fallback (“Tilslutter smagningen…”) for non‑JS or during hydration (often skipped due to redirect).

## Refactoring for Reuse
Create `app/database/utils/joinSessionByCode.server.ts` to wrap:
- Session lookup by join code
- Idempotent join logic
- Websocket emissions

Reuse in:
- Existing POST `joinByCode` action
- New GET loader

## Login Flow Enhancement
Modify `routes/auth/login.tsx` to:
- Read `next` query param
- After successful auth: `redirect(next || "/sessions")`
- Maintains seamless auto‑join after login

## Handling Already Joined
Before inserting:
```ts
const existing = await db.query.sessionUsers.findFirst({
  where: and(
    eq(sessionUsers.sessionId, session.id),
    eq(sessionUsers.userId, user.id)
  ),
});
if (!existing) {
  await joinSessionById({ sessionId: session.id, userId: user.id });
}
```
Ensures idempotency.

## Security & Semantics
- GET mutation acceptable for low‑risk “join” (non‑destructive).
- If stricter REST desired: serve landing page that auto‑POSTs via hidden form (more friction).
- Validate join code to reduce DB noise.
- CSRF risk minimal; joining does not alter other users’ data destructively.

## Error States & UX
| Scenario | Behavior |
|----------|----------|
| Invalid code | 404 + friendly message (“Pinkoden er ikke gyldig”). |
| Finished session | Redirect to read‑only results `/sessions/{id}/view`. |
| Not logged in | Redirect to login preserving `next` param. |
| Already joined | Skip insertion; redirect normally. |
| Server error | Generic 500 + retry suggestion. |

Optional: rate-limit invalid codes per IP if abuse appears.

## Share Link Generation
Helper:
```ts
export const getSessionShareLink = (joinCode: string) =>
  `${process.env.APP_URL}/sessions/j/${joinCode}`;
```
Used in:
- Session list
- “Copy invitation link” button
- Future QR code generator

## Optional Enhancements (Future)
- Pulsing placeholder / skeleton while joining
- QR code export (PNG/SVG)
- `?src=invite` analytics tagging
- Expiring invites (signed tokens vs static codes)
- Deep link hints for Untappd mobile
- Localized multi-language invite messages

## Files to Add / Modify
| File | Change |
|------|--------|
| `app/routes.ts` | Add new route mapping. |
| `app/routes/sessions/directJoin.tsx` | New loader + minimal component. |
| `app/database/utils/joinSessionByCode.server.ts` | Shared logic wrapper. |
| `app/auth/login.tsx` | Support `next` parameter. |
| `app/utils/share.ts` (optional) | Helper & future QR utilities. |
| `README.md` | Document auto‑join link format. |

## Implementation Sketch (Loader)
```ts
import { redirect } from "react-router";
import { userSessionGet } from "~/auth/users.server";
import { joinSessionByCode } from "~/database/utils/joinSessionByCode.server";
import { SessionStatus } from "~/types/session";

export async function loader({ request, params }: Route.LoaderArgs) {
  const rawCode = params.joinCode;
  if (!rawCode) throw new Response("Join code mangler", { status: 400 });

  const joinCode = rawCode.toUpperCase();
  if (!/^[A-Z0-9]{4,10}$/.test(joinCode)) {
    throw new Response("Pinkoden er ikke gyldig", { status: 404 });
  }

  const user = await userSessionGet(request);
  if (!user) {
    return redirect(`/auth/login?next=/sessions/j/${joinCode}`);
  }

  const result = await joinSessionByCode(joinCode, user.id);
  if (!result.session) {
    throw new Response("Pinkoden er ikke gyldig", { status: 404 });
  }

  if (result.session.state?.status === SessionStatus.finished) {
    return redirect(`/sessions/${result.session.id}/view`);
  }

  return redirect(`/sessions/${result.session.id}`);
}

export default function DirectJoin() {
  return <p>Tilslutter smagningen…</p>;
}
```

## Decision Summary
- Use a GET route for frictionless sharing.
- Make logic idempotent.
- Preserve authentication flow with `next` param.
- Consolidate join logic to avoid duplication.
- Keep extensible for future invite/analytics features.

## Next Step (When Ready to Implement)
1. Add route entry.
2. Extract shared join-by-code utility.
3. Add login `next` redirect handling.
4. Provide copy link UI in session list.
5. Update docs.

(End of plan)
