import express, { Application } from "express";
import { ApiConfig } from "./types/order.types";
import { RedisService } from "./services/redis.service";
import { orderController } from "./controllers/orderController";
import { createOrderRouter } from "./routes/order.routes";

export interface AppInstance {
  app: Application;
  redisService: RedisService;
}

/**
 * App Factory: Instantiates services, injects  into controllers,
 * and configures the Express application.
 */
export async function createApp(config: ApiConfig): Promise<AppInstance> {
  const redisService = new RedisService(config);

  try {
    await redisService.connect();
    console.log("[OK] Successfully connected to Redis broker.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[WARN] Initial Redis connection deferred (${msg}).`);
  }
  const controller = new orderController(redisService);
  const app: Application = express();
  app.use(express.json());
  app.use("/", createOrderRouter(controller));

  return { app, redisService };
}
