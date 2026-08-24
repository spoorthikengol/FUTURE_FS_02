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
  // Never let credentials reach a log line or a thrown error message.
  return uri.replace(/\/\/[^@/]+@/, "//<redacted>@");
}

function explainConnectionFailure(uri: string, error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const isSelectionError =
    name === "MongooseServerSelectionError" || name === "MongoServerSelectionError";

  if (!isSelectionError) {
    return error instanceof Error ? error.message : String(error);
  }

  const isSrv = uri.startsWith("mongodb+srv://");
  const usesAtlasHosts = /\.mongodb\.net/i.test(uri);
  const hasTlsParam = /[?&](ssl|tls)=true/i.test(uri);
  const hasReplicaSetParam = /[?&]replicaSet=/i.test(uri);

  const hints: string[] = [];
  if (usesAtlasHosts && !isSrv && !hasTlsParam) {
    hints.push(
      "MONGODB_URI uses mongodb:// against Atlas hosts without ssl=true (or tls=true) in the query string. Atlas requires TLS; mongodb+srv:// enables it implicitly, a manually built mongodb:// string does not.",
    );
  }
  if (usesAtlasHosts && !isSrv && !hasReplicaSetParam) {
    hints.push(
      "MONGODB_URI is missing replicaSet=<name>. Without it the driver may not be able to determine which host is primary.",
    );
  }
  hints.push(
    "This can also mean your current IP is not on the Atlas Network Access allow-list (Atlas dashboard -> Network Access -> Add IP Address). That is an Atlas project setting, not an application bug.",
  );

  return `Could not reach MongoDB Atlas (${redactUri(uri)}). ${hints.join(" ")}`;
}

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = getMongoUri();
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error: unknown) => {
        // A failed attempt must not permanently wedge the app on a cached
        // rejected promise -- clear it so the next request can retry once
        // Atlas (or the network) recovers.
        cache.promise = null;
        throw new Error(explainConnectionFailure(uri, error));
      });
  }

  cache.conn = await cache.promise;
  await seedDatabase();
  return cache.conn;
}