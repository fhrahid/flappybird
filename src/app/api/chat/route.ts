import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const player = await prisma.player.findUnique({
      where: { id: playerId }
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    const chatMessage = await prisma.message.create({
      data: {
        content: message.substring(0, 100),
        playerId: playerId
      },
      include: {
        player: {
          select: { name: true }
        }
      }
    })

    const responseData = {
      id: chatMessage.id,
      playerName: chatMessage.player.name,
      message: chatMessage.content,
      timestamp: chatMessage.createdAt.toISOString()
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
