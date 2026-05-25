# Flappy Bird Online

A multiplayer Flappy Bird game with global rankings and live chat.

## Features

- Real-time multiplayer gameplay
- Global leaderboard (top 10 players)
- Live chat with flood protection
- Player name input on startup

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** Neon PostgreSQL (serverless)
- **Real-time:** Server-Sent Events (SSE)
- **Styling:** Tailwind CSS

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/fhrahid/flappybird.git
cd flappybird
```

### 2. Create Neon Database

1. Go to [Neon](https://neon.tech) and create a free account
2. Create a new project
3. Copy your connection string (starts with `postgresql://...`)

### 3. Configure Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Or set it in Vercel dashboard → Settings → Environment Variables.

### 4. Run Database Migrations

Run this SQL in Neon SQL Editor:

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(15) UNIQUE NOT NULL,
  high_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  points INTEGER NOT NULL,
  player_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content VARCHAR(100) NOT NULL,
  player_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_players_high_score ON players(high_score DESC);
CREATE INDEX idx_scores_player_id ON scores(player_id);
CREATE INDEX idx_messages_player_id ON messages(player_id);
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
2. Add `DATABASE_URL` environment variable in Vercel
3. Run the SQL migrations in your Neon project
4. Deploy!

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
