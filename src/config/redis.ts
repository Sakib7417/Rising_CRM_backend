import { createClient, type RedisClientType } from "redis";
import { env } from "./env";

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) {
    return client;
  }
  client = createClient({ url: env.REDIS_URL });
  client.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Redis Client Error", err);
  });
  await client.connect();
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
}
