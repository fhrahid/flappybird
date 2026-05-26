import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDb()
    const players = db.collection('players')

    const leaderboard = await players
      .find({})
      .sort({ highScore: -1 })
      .limit(10)
      .toArray()

    const result = leaderboard.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      highScore: player.highScore || 0
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
