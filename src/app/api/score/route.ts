import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { playerId, score } = await request.json()

    if (!playerId || typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const sql = getSql()

    const existing = await sql`SELECT id, high_score FROM players WHERE id = ${playerId}`

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Record the score
    await sql`
      INSERT INTO scores (id, points, player_id, created_at)
      VALUES (${crypto.randomUUID()}, ${score}, ${playerId}, NOW())
    `

    let newHighScore = existing[0].high_score
    let rank = 0

    if (score > existing[0].high_score) {
      await sql`UPDATE players SET high_score = ${score} WHERE id = ${playerId}`
      newHighScore = score
    }

    // Calculate rank
    const higherScores = await sql`SELECT COUNT(*) as count FROM players WHERE high_score > ${newHighScore}`
    rank = Number(higherScores[0].count) + 1

    return NextResponse.json({
      rank,
      highScore: newHighScore
    })
  } catch (error) {
    console.error('Error submitting score:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
