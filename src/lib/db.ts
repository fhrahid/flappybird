import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.DATABASE_URL
const DB_NAME = 'flappybird'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDb(): Promise<Db> {
  if (!MONGODB_URI) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // If we have a cached connection, use it
  if (cachedClient && cachedDb) {
    return cachedDb
  }

  // Create new connection with timeouts
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  })

  try {
    await client.connect()
    cachedClient = client
    cachedDb = client.db(DB_NAME)
    return cachedDb
  } catch (error) {
    console.error('MongoDB connection error:', error)
    cachedClient = null
    cachedDb = null
    throw error
  }
}
