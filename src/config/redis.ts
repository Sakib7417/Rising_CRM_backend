import { createClient, type RedisClientType } from "redis";
import { env } from "./env";

let client: RedisClientType | null = null;
let redisAvailable = false;
let errorLogged = false;

export async function getRedis(): Promise<RedisClientType | null> {
  if (client && client.isOpen) {
    return client;
  }

  // Already failed before — don't retry
  if (errorLogged) {
    return null;
  }

  client = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: false,
      connectTimeout: 5000,
    },
  }) as RedisClientType;

  client.on("error", () => {
    if (!errorLogged) {
      // eslint-disable-next-line no-console
      console.warn("Redis unavailable — running without cache.");
      errorLogged = true;
    }
    redisAvailable = false;
  });

  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timeout after 5 seconds")), 5000)
      ),
    ]);
    redisAvailable = true;
    // eslint-disable-next-line no-console
    console.log("Redis connected");
    return client;
  } catch {
    redisAvailable = false;
    errorLogged = true;
    try { await client.disconnect(); } catch { /* ignore */ }
    client = null;
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable && client !== null && (client as RedisClientType).isOpen;
}

export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  redisAvailable = false;
  errorLogged = false;
}
