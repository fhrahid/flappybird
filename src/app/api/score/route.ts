import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { playerId, score } = await request.json()

    if (!playerId || typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Invalid request' },
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

    await prisma.score.create({
      data: {
        points: score,
        playerId: playerId
      }
    })

    let newHighScore = player.highScore
    let rank = 0

    if (score > player.highScore) {
      await prisma.player.update({
        where: { id: playerId },
        data: { highScore: score }
      })
      newHighScore = score
    }

    const higherScores = await prisma.player.count({
      where: {
        highScore: { gt: newHighScore }
      }
    })
    rank = higherScores + 1

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
