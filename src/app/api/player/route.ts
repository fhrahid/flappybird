import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || name.length < 2 || name.length > 15) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 15 characters' },
        { status: 400 }
      )
    }

    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_]/g, '')

    if (sanitizedName.length < 2) {
      return NextResponse.json(
        { error: 'Invalid name format' },
        { status: 400 }
      )
    }

    let player = await prisma.player.findUnique({
      where: { name: sanitizedName }
    })

    if (!player) {
      player = await prisma.player.create({
        data: { name: sanitizedName }
      })
    }

    return NextResponse.json({
      id: player.id,
      name: player.name,
      highScore: player.highScore
    })
  } catch (error) {
    console.error('Error creating/finding player:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
