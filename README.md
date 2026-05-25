# Flappy Bird Online

A multiplayer Flappy Bird game with global rankings and live chat.

## Features

- Real-time multiplayer gameplay
- Global leaderboard (top 10 players)
- Live chat with flood protection
- Player name input on startup

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** MongoDB
- **Real-time:** Server-Sent Events (SSE)
- **Styling:** Tailwind CSS

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/fhrahid/flappybird.git
cd flappybird
```

### 2. Configure Environment Variables

Create a `.env` file with your MongoDB connection string:

```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
```

Or set it in Vercel dashboard → Settings → Environment Variables.

### 3. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/fhrahid/flappybird)

1. Fork or import this repository
2. Add `DATABASE_URL` environment variable in Vercel with your MongoDB URI
3. Deploy!

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
