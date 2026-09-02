import mongoose from "mongoose";
import dns from "node:dns";

import { getMongoUri } from "@/lib/env";
import { seedDatabase } from "@/lib/seed";
dns.setServers(["192.168.137.18"]);

console.log("MongoDB DNS servers:", dns.getServers());

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

// Fix MongoDB Atlas SRV DNS resolution on this network.
// This runs inside the Node.js server where MongoDB is accessed.
try {
  dns.setServers(["192.168.137.18"]);
  console.log("MongoDB DNS servers:", dns.getServers());
} catch (error) {
  console.error("Failed to configure DNS:", error);
}

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

  // Connection already in progress
  if (cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }

  const uri = getMongoUri();

  console.log("Connecting to MongoDB...");
  console.log("DNS servers:", dns.getServers());

  cache.promise = mongoose
    .connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    })
    .then(async () => {
      console.log("MongoDB connection successful");

      cache.conn = mongoose;

      // Seed only after MongoDB connection is confirmed.
      await seedDatabase();

      return mongoose;
    })
    .catch((error: unknown) => {
      cache.promise = null;
      cache.conn = null;

      console.error("MongoDB connection failed:", error);

      throw new Error(explainConnectionFailure(uri, error));
    });

  cache.conn = await cache.promise;

  return cache.conn;
}