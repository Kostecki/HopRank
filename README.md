# HopRank 🍺

**HopRank** is a real-time collaborative beer rating platform that brings together beer enthusiasts to rank and review beers in organized tasting sessions. Think of it as a digital beer competition platform with integrated Untappd support.

## What is HopRank?

HopRank allows groups of people to create structured beer tasting sessions where participants collaboratively rate beers across multiple criteria. The platform automatically calculates rankings, creates leaderboards, and can even integrate with Untappd for seamless check-ins.

### Key Features

🍺 **Collaborative Beer Sessions**
- Create or join beer tasting sessions with friends
- Real-time synchronization across all participants
- Structured voting with customizable rating criteria

🏆 **Smart Ranking System**
- Multi-criteria scoring with weighted averages
- Automatic leaderboard generation with podium visualization
- Detailed breakdown of ratings by criteria

🔗 **Untappd Integration**
- OAuth authentication with Untappd
- Automatic beer search and data fetching
- Direct check-in to Untappd with your ratings
- Venue detection and integration

⚡ **Real-time Experience**
- WebSocket-powered live updates
- Session progress tracking
- Live voting status for all participants

🍻 **One Beer Mode**
- The same beer at different bars, for a pub crawl
- Everyone ranks the bars on their own list instead of giving scores
- The group result is based on the average position

📱 **Mobile-First Design**
- Responsive design built with Mantine UI
- Touch-friendly rating sliders
- Mobile app integration (Untappd deep links)

## How It Works

A session runs in one of two modes, chosen when it's created. The mode can't be changed afterwards. The steps below describe normal mode; [One Beer mode](#one-beer-mode) has its own section.

### 1. Session Creation
- Create a new tasting session with a unique join code
- Define rating criteria (e.g., Appearance, Aroma, Taste, etc.)

### 2. Adding Beers
- Search Untappd's database to find beers
- Add beers to the session queue
- Beers are automatically shuffled for random ordering

### 3. Rating Process
- The session progresses through each beer one by one
- All participants rate the current beer on each criterion
- Ratings are submitted simultaneously for fairness
- Integration with Untappd for automatic check-ins

### 4. Results & Rankings
- Real-time calculation of weighted averages
- Podium-style visualization of top 3 beers
- Detailed results table with all ratings
- Individual criteria breakdowns

### 5. Session States
- **Created**: Session setup, adding beers
- **Active**: Started by the owner. Rating beers, and stays active after the last beer is rated
- **Finished**: Ended by the owner or an admin with "Afslut smagning" (also before it has started), or by a cleanup job once the session is both old and idle (see `MAX_SESSION_AGE_HOURS` and `MAX_SESSION_IDLE_TIME_HOURS`). This can't be undone

### Who Can See a Session

- A session is only visible to the people in it, and afterwards to the people who were in it (except anyone who was kicked)
- Joining takes the join code, from someone in the session
- **Big screen**: open `/v/<join code>` on a device to show the session's results view without logging in. The device stays unlocked for that session for 48 hours. Participants can copy the link from the session menu ("Kopiér link til storskærm")

### One Beer Mode

The same beer, ranked at different bars. There are no scores or criteria.

- **Setup**: Pick the one beer when creating the session. The first bar can be added before the owner starts it
- **Adding bars**: Search for a venue, or type a name if it isn't found or you aren't logged in with Untappd. A typed bar can later be linked to a venue. Each bar can only be on the list once
- **The shared list**: Everyone in the session can add bars, remove upcoming ones and reorder them. Bars open in that order, not shuffled
- **Ranking**: Each person drags the open bar into their own ranking and saves. The next bar opens once all active participants have ranked the current one
- **Results**: The group ranking is based on each bar's average position. Positions are relative to the length of each person's list, so late joiners count fairly. When everyone ranked every bar, it's the plain average
- **Venue details**: A bar's address and category come from Untappd, and are refreshed from search results while the session is unfinished

## Getting Started

### Installation

Node and pnpm versions are pinned: Node in `mise.toml`, pnpm in the `packageManager` field of `package.json`. With [mise](https://mise.jdx.dev) installed:

```bash
mise install  # installs the pinned Node version
pnpm install  # pnpm switches itself to the pinned version
```

### Environment Setup

Create a `.env` file with the required environment variables. Below is a consolidated list grouped by purpose.

#### Required (Core Functionality)

| Variable | Purpose |
|----------|---------|
| `APP_URL` | Base URL of the app (used to build OAuth callback URLs) |
| `SESSION_SECRET` | Secret for signing session cookies |
| `UNTAPPD_CLIENT_ID` | Untappd OAuth client ID |
| `UNTAPPD_CLIENT_SECRET` | Untappd OAuth client secret |
| `UNTAPPD_REDIRECT_URL` | The redirect URL registered with Untappd |
| `TOTP_SECRET` | Base secret for generating login codes |
| `SMTP_FROM` | From address for outbound emails |
| `SMTP_HOST` | SMTP server host for email login links |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP auth username |
| `SMTP_PASS` | SMTP auth password |
| `DATABASE_PATH` | Directory with the SQLite database and the Drizzle schema (`./app/database`) |
| `VITE_ALGOLIA_APP_ID` | Algolia application ID for beer search |
| `VITE_ALGOLIA_API_K` | Algolia search-only API key |
| `VITE_WS_URL` | WebSocket endpoint used by the client (e.g. `http://localhost:4000`). Set at build time |

#### Optional / Feature-Specific

| Variable | Purpose |
|----------|---------|
| `DATABASE_FILE_NAME` | Name of the database file (default: data.db) |
| `ADMIN_USER_EMAILS` | Comma-separated email addresses that get admin on login |
| `DRIZZLE_GATEWAY_MASTERPASS` | Master password for Drizzle Gateway |
| `MAX_SESSION_AGE_HOURS` | Auto-close sessions older than this (default: 24) |
| `MAX_SESSION_IDLE_TIME_HOURS` | Timeout for "idle" session (default: 6) |
| `UNTAPPD_DEV_CALLBACK_URL` | Where the production callback relays Untappd logins started from a dev server (default: `http://localhost:5173/auth/untappd/callback`) |
| `VITE_UMAMI_SRC_URL` | Umami analytics script URL (production only) |
| `VITE_UMAMI_WEBSITE_ID` | Umami website/site ID |
| `VITE_LATEST_COMMIT_HASH` | Injected at build time for UI display of current commit |
| `VITE_LATEST_COMMIT_MESSAGE` | Injected commit message for display |

#### Local development

Start from the example file, which has every variable with comments:

```bash
cp .env.example .env
```

### Database Setup

Apply the migrations to create or update the database:

```bash
pnpm db:migrate
```

After changing `app/database/schema.server.ts`, create a migration with `pnpm db:generate` and apply it with `pnpm db:migrate`.

### Development

Start the development server:

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`.

To test on a phone, run `pnpm dev --host` and open your computer's IP address on port 5173. With a `localhost` `VITE_WS_URL`, the socket connects to whichever host the page was opened on.

### Additional Scripts

```bash
pnpm db:studio  # Open Drizzle Studio for database management
pnpm typecheck  # Run TypeScript type checking
pnpm lint       # Run Biome linter
pnpm test       # Run the tests
```

## Project Structure

```
app/
├── auth/              # Authentication strategies and user management
├── components/        # React components
│   ├── modals/        # Modal dialogs
│   ├── auth/          # Authentication-related components
│   └── ...            # Core app components
├── database/          # Database schema, config, and utilities
│   └── utils/         # Database helper functions
├── routes/            # React Router routes
│   ├── api/           # API endpoints
│   ├── auth/          # Authentication routes
│   └── sessions/      # Session-related routes
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── hooks/             # Custom React hooks
drizzle/               # Database migration files
public/                # Favicons, robots.txt, etc.
```

## Key Components

### Session Management
- **Sessions**: Main tasting sessions with join codes
- **SessionUsers**: Participants in each session
- **SessionBeers**: Beers added to sessions with ordering
- **SessionState**: Current state and progress tracking
- **SessionBars**: Bars in a One Beer session, with their order and venue details
- **BarPlacements**: Each person's position for each bar in a One Beer session

### Rating System
- **Criteria**: Configurable rating categories
- **Ratings**: Individual user ratings for each beer/criterion
- **Weighted Scoring**: Automatic calculation with criterion weights

### Untappd Integration
- **OAuth Flow**: Secure authentication with Untappd
- **Beer Search**: Real-time search using Algolia
- **Check-ins**: Automatic posting to Untappd with ratings
- **Venue Detection**: GPS-based venue selection

## Deployment

### Docker Deployment

Build and run with Docker:

```bash
docker build -t hoprank .
docker run -p 3000:3000 -p 4000:4000 hoprank
```

### Environment Variables for Production

The application supports the following production environment variables:

```env
VITE_WS_URL=wss://your-domain.com
VITE_ALGOLIA_APP_ID=production_algolia_app_id
VITE_ALGOLIA_API_K=production_algolia_api_key
VITE_UMAMI_SRC_URL=analytics_url
VITE_UMAMI_WEBSITE_ID=analytics_id
```
