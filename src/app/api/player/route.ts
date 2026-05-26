import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || name.trim().length < 2 || name.trim().length > 15) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 15 characters' },
        { status: 400 }
      )
    }

    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9 ]/g, '')
    if (sanitizedName.length < 2) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const db = await getDb()
    const players = db.collection('players')

    // Find existing player
    const existing = await players.findOne({ name: sanitizedName })

    if (existing) {
      return NextResponse.json({
        id: existing._id.toString(),
        name: existing.name,
        highScore: existing.highScore || 0
      })
    }

    // Create new player
    const result = await players.insertOne({
      name: sanitizedName,
      highScore: 0,
      createdAt: new Date()
    })

    return NextResponse.json({
      id: result.insertedId.toString(),
      name: sanitizedName,
      highScore: 0
    })
  } catch (error: any) {
    console.error('Error creating/finding player:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
