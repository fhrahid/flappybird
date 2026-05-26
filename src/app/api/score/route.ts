import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { playerId, score } = await request.json()

    if (!playerId || typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const db = await getDb()
    const players = db.collection('players')
    const scores = db.collection('scores')

    const player = await players.findOne({ _id: new ObjectId(playerId) })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Record the score
    await scores.insertOne({
      points: score,
      playerId: new ObjectId(playerId),
      createdAt: new Date()
    })

    let newHighScore = player.highScore || 0
    let rank = 0

    if (score > newHighScore) {
      await players.updateOne(
        { _id: new ObjectId(playerId) },
        { $set: { highScore: score } }
      )
      newHighScore = score
    }

    // Calculate rank
    const higherScores = await players.countDocuments({ highScore: { $gt: newHighScore } })
    rank = higherScores + 1

    return NextResponse.json({ rank, highScore: newHighScore })
  } catch (error: any) {
    console.error('Error submitting score:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
