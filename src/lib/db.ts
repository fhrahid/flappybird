import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.DATABASE_URL!
const DB_NAME = 'flappybird'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDb(): Promise<Db> {
  // If we have a cached connection and it's still connected, use it
  if (cachedClient && cachedDb) {
    return cachedDb
  }

  // Create new connection with timeout
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })

  try {
    await client.connect()
    cachedClient = client
    cachedDb = client.db(DB_NAME)
    return cachedDb
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

// For serverless, we want to reuse connections
export function getClient(): MongoClient {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
  }
  return cachedClient
}
