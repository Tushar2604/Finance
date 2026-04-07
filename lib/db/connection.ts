import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Extend global for Next.js hot-reload caching
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null }

if (!global.mongooseCache) {
  global.mongooseCache = cache
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn
  }

  if (!cache.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    }

    cache.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('[DB] MongoDB connected successfully')
        return mongooseInstance
      })
      .catch((err) => {
        cache.promise = null
        console.error('[DB] MongoDB connection error:', err)
        throw err
      })
  }

  try {
    cache.conn = await cache.promise
  } catch (err) {
    cache.promise = null
    throw err
  }

  return cache.conn
}

export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect()
    cache.conn = null
    cache.promise = null
    console.log('[DB] MongoDB disconnected')
  }
}

export default connectDB
