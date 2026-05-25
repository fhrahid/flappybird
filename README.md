# Flappy Bird Online

A multiplayer Flappy Bird game with global rankings and live chat.

## Features

- Real-time multiplayer gameplay
- Global leaderboard (top 10 players)
- Live chat with flood protection
- Player name input on startup

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** Turso (SQLite at the edge)
- **Real-time:** Server-Sent Events (SSE)
- **Styling:** Tailwind CSS

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/fhrahid/flappybird.git
cd flappybird
```

### 2. Create Turso Database

1. Install Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
2. Sign up at [turso.tech](https://turso.tech)
3. Create database:
   ```bash
   turso db create flappy-bird
   turso db show flappy-bird
   ```
4. Get connection URL:
   ```bash
   turso db show flappy-bird --url
   ```

### 3. Configure Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=libsql://your-database-name-your-org.turso.io?authToken=your-token-here
```

Or set it in Vercel dashboard → Settings → Environment Variables.

### 4. Run Database Migrations

```bash
turso db shell flappy-bird
```

Then run:

```sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  high_score INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  points INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  player_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_players_high_score ON players(high_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player_id ON scores(player_id);
CREATE INDEX IF NOT EXISTS idx_messages_player_id ON messages(player_id);
```

### 5. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/fhrahid/flappybird)

1. Fork or import this repository
2. Create a Turso database and get the URL
3. Add `DATABASE_URL` environment variable in Vercel
4. Run the SQL migrations in Turso shell
5. Deploy!

## Controls

- **Space / Click** - Jump
- **Enter** - Start game / Send chat message

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/player` | POST | Create or get player |
| `/api/score` | POST | Submit game score |
| `/api/leaderboard` | GET | Get top 10 players |
| `/api/chat` | POST | Send chat message |
| `/api/chat/stream` | GET | SSE stream for messages |
