import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

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

    // Try to find existing player
    const existing = await query(
      'SELECT id, name, high_score FROM players WHERE name = ?',
      [sanitizedName]
    )

    if (existing.length > 0) {
      return NextResponse.json({
        id: existing[0].id,
        name: existing[0].name,
        highScore: existing[0].high_score
      })
    }

    // Create new player
    const id = crypto.randomUUID()
    await query(
      'INSERT INTO players (id, name, high_score, created_at) VALUES (?, ?, 0, datetime("now"))',
      [id, sanitizedName]
    )

    return NextResponse.json({
      id,
      name: sanitizedName,
      highScore: 0
    })
  } catch (error) {
    console.error('Error creating/finding player:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
