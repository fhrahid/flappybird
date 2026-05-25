# Flappy Bird Online - Specification

## 1. Project Overview

**Project Name:** Flappy Bird Online
**Type:** Real-time multiplayer web game with leaderboard and chat
**Core Functionality:** A Flappy Bird clone with global player rankings and live chat
**Target Users:** Casual gamers who want competitive, social gameplay

---

## 2. Technical Stack

- **Frontend:** Next.js 14 (App Router)
- **Backend:** Next.js API Routes
- **Database:** SQLite with Prisma ORM
- **Real-time:** Server-Sent Events (SSE) for chat and leaderboard updates
- **Styling:** Tailwind CSS

---

## 3. Visual & UI Specification

### Color Palette
- **Background (Sky):** `#87CEEB` (light sky blue)
- **Ground:** `#8B4513` (saddle brown) with `#228B22` grass
- **Bird:** `#FFD700` (golden yellow) with `#FF8C00` beak
- **Pipes:** `#2E8B57` (sea green)
- **UI Panels:** `#1a1a2e` with `rgba(255,255,255,0.1)` glass effect
- **Accent:** `#00ff88` (neon green)
- **Text:** `#ffffff` primary, `#a0a0a0` secondary

### Typography
- **Primary Font:** "Press Start 2P" (Google Fonts - pixel style)
- **Fallback:** monospace

### Layout
```
┌─────────────────────────────────────────────────┐
│  [Logo]     [Score: 0]     [Rank: #1]           │
├─────────────────────────────────────────────────┤
│                                                 │
│              GAME CANVAS (600x800)              │
│                                                 │
│    🐦 ←→  |████|    |████|                      │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌───────────────────────────┐ │
│  │  RANKINGS   │  │       LIVE CHAT           │ │
│  │  1. Player  │  │  [message history]        │ │
│  │  2. Player  │  │                           │ │
│  │  ...        │  │  [input] [send]           │ │
│  └─────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Animations
- Bird: smooth sine-wave idle animation, rotation based on velocity
- Pipes: continuous horizontal scroll
- Score: pop animation on increment
- Chat messages: slide-in from left
- Death: screen shake + flash

---

## 4. Game Mechanics

### Core Gameplay
- **Bird:** Affected by gravity, jumps on click/spacebar
- **Pipes:** Random gap position, scroll left at constant speed
- **Collision:** Game over on pipe or ground contact
- **Scoring:** +1 point for each pipe passed

### Game States
1. **NAME_INPUT** - Initial screen asking for player name
2. **READY** - Player entered name, waiting to start
3. **PLAYING** - Active gameplay
4. **GAME_OVER** - Show final score, save to leaderboard

### Controls
- **Spacebar / Click / Tap** - Jump
- **Enter** - Start game / Send chat message

---

## 5. Features Specification

### Name Input Screen
- Large input field for player name (max 15 chars)
- "Play" button to confirm
- Name validation: 2-15 alphanumeric characters
- Name displayed in header after confirmation

### Game Canvas
- Canvas-based rendering (HTML5 Canvas API)
- Responsive sizing (max 600px width, scales down)
- 60 FPS target frame rate

### Leaderboard Panel
- Top 10 players by highest score
- Shows: Rank, Name, Score
- Auto-refreshes every 5 seconds via SSE
- Highlights current player's entry

### Global Chat
- Real-time message delivery via SSE
- Shows: Player name (colored), message, timestamp
- Max 50 messages in view
- Max message length: 100 characters
- Flood protection: 1 message per 2 seconds

---

## 6. API Endpoints

### `POST /api/player`
Create or get player by name
```json
Request: { "name": "string" }
Response: { "id": "uuid", "name": "string", "highScore": 0 }
```

### `POST /api/score`
Submit a game score
```json
Request: { "playerId": "uuid", "score": number }
Response: { "rank": number, "highScore": number }
```

### `GET /api/leaderboard`
Get top 10 players
```json
Response: [{ "rank": 1, "name": "string", "highScore": 42 }]
```

### `GET /api/chat/stream`
SSE endpoint for chat messages
```json
Event: message
Data: { "id": "uuid", "playerName": "string", "message": "string", "timestamp": "ISO" }
```

### `POST /api/chat/send`
Send a chat message
```json
Request: { "playerId": "uuid", "message": "string" }
Response: { "success": true }
```

---

## 7. Database Schema (Prisma + SQLite)

```prisma
model Player {
  id        String   @id @default(uuid())
  name      String   @unique
  highScore Int      @default(0)
  createdAt DateTime @default(now())
  scores    Score[]
  messages  Message[]
}

model Score {
  id        String   @id @default(uuid())
  points    Int
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  createdAt DateTime @default(now())
}

model Message {
  id        String   @id @default(uuid())
  content   String
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  createdAt DateTime @default(now())
}
```

---

## 8. Acceptance Criteria

1. ✅ Player can enter name and see it in header
2. ✅ Game starts on first jump input
3. ✅ Bird responds to click/spacebar with upward velocity
4. ✅ Pipes spawn and scroll left continuously
5. ✅ Collision detection works accurately
6. ✅ Score increments when passing pipes
7. ✅ Game over screen shows with final score
8. ✅ Score saves to database on game over
9. ✅ Leaderboard shows top 10 players
10. ✅ Chat messages appear in real-time
11. ✅ Chat has flood protection
12. ✅ All UI elements are visible and properly styled
13. ✅ Responsive layout works on mobile
