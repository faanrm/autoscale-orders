import { loadConfig } from "./config/config";
import { createApp } from "./app";

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  console.log("Starting Order API");
  console.log(`Listening on port : ${config.port}`);
  console.log(`Redis Broker     : ${config.redisHost}:${config.redisPort}`);
  console.log(`Target Queue     : ${config.redisQueue}`);

  const { app, redisService } = await createApp(config);

  const server = app.listen(config.port, () => {
    console.log(`[READY] Order API listening on http://0.0.0.0:${config.port}`);
  });

  // Graceful shutdown handling (SIGTERM / SIGINT)
  const shutdown = async (signalName: string) => {
    console.log(`\n[SIGNAL] ${signalName} received. Gracefully shutting down HTTP server...`);

    server.close(async () => {
      console.log("[INFO] HTTP server stopped. Closing Redis connection...");
      await redisService.close();
      console.log("[INFO] Redis connection closed. Process exiting.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[FORCE] Forceful shutdown after timeout.");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("[FATAL] Error starting Order API:", err);
  process.exit(1);
});
