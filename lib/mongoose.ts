import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __mongooseCache__: MongooseCache | undefined;
}

const globalCache = global.__mongooseCache__ ?? {
  conn: null,
  promise: null,
};

global.__mongooseCache__ = globalCache;

const getMongoUri = () =>
  process.env.MONGODB_URL ?? process.env.MONGODB_URI ?? process.env.DATABASE_URL;

const getMongoDbName = () =>
  process.env.MONGODB_DB_NAME ?? process.env.MONGODB_DATABASE;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown MongoDB error";

export const connectToDB = async () => {
  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);
  mongoose.set("bufferTimeoutMS", 5000);

  const mongoUri = getMongoUri();
  const mongoDbName = getMongoDbName();

  if (!mongoUri) {
    throw new Error(
      "Missing MongoDB URI env (set MONGODB_URL or MONGODB_URI or DATABASE_URL)"
    );
  }

  if (mongoose.connection.readyState === 1 && globalCache.conn) {
    return globalCache.conn;
  }

  if (mongoose.connection.readyState === 2 && globalCache.promise) {
    await globalCache.promise;
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(mongoUri, {
        dbName: mongoDbName,
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 0,
      })
      .then((mongooseInstance) => {
        globalCache.conn = mongooseInstance;
        return mongooseInstance;
      })
      .catch((error) => {
        globalCache.promise = null;
        throw error;
      });
  }

  try {
    await globalCache.promise;
    return globalCache.conn;
  } catch (error) {
    globalCache.promise = null;
    globalCache.conn = null;
    throw new Error(
      `MongoDB connection failed (db=${mongoDbName ?? "<default>"}): ${getErrorMessage(error)}`
    );
  }
};
