import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { connections } from '@/lib/chat-store'

export async function POST(request: NextRequest) {
  try {
    const { playerId, message } = await request.json()

    if (!playerId || !message) {
      return NextResponse.json({ error: 'Missing playerId or message' }, { status: 400 })
    }

    if (message.length > 100) {
      return NextResponse.json({ error: 'Message too long (max 100 characters)' }, { status: 400 })
    }

    const db = await getDb()
    const players = db.collection('players')

    const player = await players.findOne({ _id: new ObjectId(playerId) })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const id = new ObjectId()
    const timestamp = new Date().toISOString()

    await db.collection('messages').insertOne({
      _id: id,
      content: message.substring(0, 100),
      playerId: new ObjectId(playerId),
      playerName: player.name,
      createdAt: timestamp
    })

    const responseData = {
      id: id.toString(),
      playerName: player.name,
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
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
