import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.DATABASE_URL
const DB_NAME = 'flappybird'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDb(): Promise<Db> {
  if (!MONGODB_URI) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  if (cachedClient && cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: false,
    retryWrites: true,
    w: 'majority',
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