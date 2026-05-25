import { createClient } from '@libsql/client'

let _client: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _client = createClient({
      url: process.env.DATABASE_URL
    })
  }
  return _client
}

// Helper to run queries
export async function query(sql: string, params: any[] = []) {
  const db = getDb()
  const result = await db.execute({ sql, args: params })
  return result.rows
}
