import mongoose from "mongoose";

import { getMongoUri } from "@/lib/env";
import { seedDatabase } from "@/lib/seed";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalForMongoose.mongooseCache = cache;

function redactUri(uri: string) {
  return uri.replace(/\/\/[^@/]+@/, "//<redacted>@");
}

function explainConnectionFailure(uri: string, error: unknown) {
  const name = error instanceof Error ? error.name : "";

  const isSelectionError =
    name === "MongooseServerSelectionError" ||
    name === "MongoServerSelectionError";

  if (!isSelectionError) {
    return error instanceof Error ? error.message : String(error);
  }

  return `Could not reach MongoDB Atlas (${redactUri(uri)}). Check that your Atlas Network Access allows your current IP address and that your MONGODB_URI is correct.`;
}

export async function connectDB() {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    cache.conn = mongoose;
    return mongoose;
  }

  // Connection is currently being established
  if (cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }

  const uri = getMongoUri();

  cache.promise = mongoose
    .connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    })
    .then(async () => {
      cache.conn = mongoose;

      // Seed only after MongoDB connection is confirmed.
      await seedDatabase();

      return mongoose;
    })
    .catch((error: unknown) => {
      cache.promise = null;
      cache.conn = null;

      throw new Error(explainConnectionFailure(uri, error));
    });

  cache.conn = await cache.promise;

  return cache.conn;
}