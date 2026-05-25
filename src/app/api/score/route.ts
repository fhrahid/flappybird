import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { playerId, score } = await request.json()

    if (!playerId || typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const existing = await query(
      'SELECT id, high_score FROM players WHERE id = ?',
      [playerId]
    )

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    const currentHighScore = Number(existing[0].high_score) || 0

    // Record the score
    await query(
      'INSERT INTO scores (id, points, player_id, created_at) VALUES (?, ?, ?, datetime("now"))',
      [crypto.randomUUID(), score, playerId]
    )

    let newHighScore = currentHighScore
    let rank = 0

    if (score > currentHighScore) {
      await query(
        'UPDATE players SET high_score = ? WHERE id = ?',
        [score, playerId]
      )
      newHighScore = score
    }

    // Calculate rank
    const higherScores = await query(
      'SELECT COUNT(*) as count FROM players WHERE high_score > ?',
      [newHighScore]
    )
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
