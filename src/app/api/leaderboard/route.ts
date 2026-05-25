import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function GET() {
  try {
    const sql = getSql()

    const players = await sql`
      SELECT name, high_score as highScore
      FROM players
      ORDER BY high_score DESC
      LIMIT 10
    `

    const leaderboard = players.map((player: any, index: number) => ({
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
