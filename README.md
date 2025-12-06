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

📱 **Mobile-First Design**
- Responsive design built with Mantine UI
- Touch-friendly rating sliders
- Mobile app integration (Untappd deep links)

## How It Works

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
- **Active**: Currently rating beers
- **Finished**: All beers rated, final results available

## Getting Started

### Installation

Install dependencies:

```bash
pnpm install
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

| `DATABASE_PATH` | Path to the SQLite database file (e.g. `./data/database.db`) |
| `VITE_ALGOLIA_APP_ID` | Algolia application ID for beer search |
| `VITE_ALGOLIA_API_K` | Algolia search-only API key |
| `VITE_WS_URL` | WebSocket endpoint used by the client (e.g. `ws://localhost:5173`) |

#### Optional / Feature-Specific

| Variable | Purpose |
|----------|---------|
| `DATABASE_FILE_NAME` | Name of the database file (default: data.db) |
| `SMTP_FROM` | From address for outbound emails |
| `SMTP_HOST` | SMTP server host for email login links |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP auth username |
| `SMTP_PASS` | SMTP auth password |
| `TOTP_SECRET` | Base secret for generating TOTP (2FA) codes |
| `MAX_SESSION_AGE_HOURS` | Auto-close sessions older than this (default: 24) |
| `MAX_SESSION_IDLE_TIME_HOURS` | Timeout for "idle" session (default: 6) |
| `VITE_UMAMI_SRC_URL` | Umami analytics script URL (production only) |
| `VITE_UMAMI_WEBSITE_ID` | Umami website/site ID |
| `VITE_LATEST_COMMIT_HASH` | Injected at build time for UI display of current commit |
| `VITE_LATEST_COMMIT_MESSAGE` | Injected commit message for display |

#### Example `.env` (local development)

```env
# Base App
APP_URL=http://localhost:5173
SESSION_SECRET=dev_super_secret

# Database
DATABASE_PATH=./data/database.db

# Untappd OAuth
UNTAPPD_CLIENT_ID=your_untappd_client_id
UNTAPPD_CLIENT_SECRET=your_untappd_client_secret

# Algolia (Beer Search)
VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_API_K=your_algolia_api_key

# WebSockets
VITE_WS_URL=ws://localhost:5173

# Optional Email (disable if not set)
SMTP_FROM=HopRank <no-reply@localhost>
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Optional 2FA
TOTP_SECRET=replace_me_for_prod

# Optional Analytics / Build Metadata
VITE_UMAMI_SRC_URL=
VITE_UMAMI_WEBSITE_ID=
VITE_LATEST_COMMIT_HASH=
VITE_LATEST_COMMIT_MESSAGE=

# Housekeeping
MAX_SESSION_AGE_HOURS=12
```

### Database Setup

Generate and run database migrations:

```bash
pnpm generate  # Generate migration files
pnpm migrate   # Apply migrations
```

### Development

Start the development server:

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`.

### Additional Scripts

```bash
pnpm studio     # Open Drizzle Studio for database management
pnpm typecheck  # Run TypeScript type checking
pnpm lint       # Run Biome linter
```

## Project Structure

```
app/
├── auth/              # Authentication strategies and user management
├── components/        # React components
│   ├── modals/       # Modal dialogs
│   ├── auth/         # Authentication-related components
│   └── ...           # Core app components
├── database/          # Database schema, config, and utilities
│   ├── migrations/   # Database migration files
│   └── utils/        # Database helper functions
├── routes/            # React Router routes
│   ├── api/          # API endpoints
│   ├── auth/         # Authentication routes
│   └── sessions/     # Session-related routes
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── hooks/             # Custom React hooks
```

## Key Components

### Session Management
- **Sessions**: Main tasting sessions with join codes
- **SessionUsers**: Participants in each session
- **SessionBeers**: Beers added to sessions with ordering
- **SessionState**: Current state and progress tracking

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
docker run -p 3000:3000 hoprank
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
