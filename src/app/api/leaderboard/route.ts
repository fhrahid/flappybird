import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: {
        highScore: 'desc'
      },
      take: 10,
      select: {
        name: true,
        highScore: true
      }
    })

    const leaderboard = players.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      highScore: player.highScore
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
