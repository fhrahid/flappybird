import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { connections } from '@/lib/chat-store'
import { ObjectId } from 'mongodb'

// Prevent Next.js from statically caching this response at build time
export const dynamic = 'force-dynamic'

// Server-side flood protection: 1 message per 2 seconds per player
const FLOOD_INTERVAL_MS = 2000
const lastMessageAt = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const { playerId, message } = await request.json()

    if (!playerId || !message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Missing playerId or message' }, { status: 400 })
    }

    if (message.trim().length > 100) {
      return NextResponse.json({ error: 'Message too long (max 100 characters)' }, { status: 400 })
    }

    if (typeof playerId !== 'string' || !ObjectId.isValid(playerId)) {
      return NextResponse.json({ error: 'Invalid playerId' }, { status: 400 })
    }

    const now = Date.now()
    const last = lastMessageAt.get(playerId) || 0
    if (now - last < FLOOD_INTERVAL_MS) {
      return NextResponse.json(
        { error: 'Please wait before sending another message' },
        { status: 429 }
      )
    }

    const db = await getDb()
    const players = db.collection('players')

    const player = await players.findOne({ _id: new ObjectId(playerId) })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    lastMessageAt.set(playerId, now)

    const content = message.trim().substring(0, 100)
    const id = new ObjectId()
    const timestamp = new Date().toISOString()

    await db.collection('messages').insertOne({
      _id: id,
      content,
      playerId: new ObjectId(playerId),
      playerName: player.name,
      createdAt: timestamp
    })

    const responseData = {
      id: id.toString(),
      playerName: player.name,
      message: content,
      timestamp
    }

    // Broadcast to all connected clients
    const encoder = new TextEncoder()
    const data = `data: ${JSON.stringify(responseData)}\n\n`

    connections.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(data))
      } catch {
        // Connection might be closed
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// Get recent messages
export async function GET() {
  try {
    const db = await getDb()
    const messages = await db.collection('messages')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json(messages.reverse().map(m => ({
      id: m._id.toString(),
      playerName: m.playerName,
      message: m.content,
      timestamp: m.createdAt
    })))
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}