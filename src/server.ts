import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { getRedis } from "./config/redis";
import { initSocket } from "./config/socket";
import { startCronJobs } from "./services/cron.service";

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  startCronJobs();

  try {
    await getRedis();
    // eslint-disable-next-line no-console
    console.log("Redis connected");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Redis unavailable, continuing without cache", err);
  }

  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Sales CRMAPI running on port ${env.PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Swagger: http://localhost:${env.PORT}/api/docs`);
  });
}

void bootstrap();
