import { MongoClient, Db } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    client = new MongoClient(process.env.DATABASE_URL)
    await client.connect()
    db = client.db('flappybird')
  }
  return db
}

export async function closeDb() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
