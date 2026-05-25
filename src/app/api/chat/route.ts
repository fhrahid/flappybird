import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { connections } from '@/lib/chat-store'

export async function POST(request: NextRequest) {
  try {
    const { playerId, message } = await request.json()

    if (!playerId || !message) {
      return NextResponse.json(
        { error: 'Missing playerId or message' },
        { status: 400 }
      )
    }

    if (message.length > 100) {
      return NextResponse.json(
        { error: 'Message too long (max 100 characters)' },
        { status: 400 }
      )
    }

    const player = await query(
      'SELECT id, name FROM players WHERE id = ?',
      [playerId]
    )

    if (player.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    const playerName = player[0].name
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    await query(
      'INSERT INTO messages (id, content, player_id, created_at) VALUES (?, ?, ?, ?)',
      [id, message.substring(0, 100), playerId, timestamp]
    )

    const responseData = {
      id,
      playerName,
      message: message.substring(0, 100),
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
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
