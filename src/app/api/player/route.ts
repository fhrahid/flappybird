import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

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

    const sql = getSql()

    // Try to find existing player
    const existing = await sql`SELECT id, name, high_score FROM players WHERE name = ${sanitizedName}`

    if (existing.length > 0) {
      return NextResponse.json({
        id: existing[0].id,
        name: existing[0].name,
        highScore: existing[0].high_score
      })
    }

    // Create new player
    const id = crypto.randomUUID()
    const result = await sql`
      INSERT INTO players (id, name, high_score, created_at)
      VALUES (${id}, ${sanitizedName}, 0, NOW())
      RETURNING id, name, high_score
    `

    return NextResponse.json({
      id: result[0].id,
      name: result[0].name,
      highScore: result[0].high_score
    })
  } catch (error) {
    console.error('Error creating/finding player:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
