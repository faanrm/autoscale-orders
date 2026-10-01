import { loadConfig } from './config/config';
import { RedisQueueService } from './services/redis.service';
import { OrderProcessorService } from './services/order-processor.service';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const redisService = new RedisQueueService(config);
  const processorService = new OrderProcessorService(config.workerId);

  console.log('Starting Order Processing Worker');
  console.log(`Worker ID   : ${config.workerId}`);
  console.log(`Redis Broker: ${config.redisHost}:${config.redisPort}`);
  console.log(`Target Queue: ${config.redisQueue}`);

  try {
    await redisService.connect();
    console.log('[OK] Connected to Redis broker.');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[FATAL] Unable to connect to Redis:', errorMsg);
    process.exit(1);
  }

  let isRunning = true;

  // Graceful shutdown handling 
  const shutdown = async (signalName: string) => {
    console.log(`\n[SIGNAL] ${signalName} received. Gracefully shutting down worker...`);
    isRunning = false;
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  while (isRunning) {
    try {
      const orderPayload = await redisService.popOrder(config.redisQueue, config.popTimeoutSec);
      if (orderPayload) {
        await processorService.process(orderPayload);
      }
    } catch (err: unknown) {
      if (isRunning) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[WARN] Error in processing loop:', errorMsg);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.log(`[INFO] Closing Redis connection and stopping worker ${config.workerId}...`);
  await redisService.disconnect();
  console.log('[OK] Worker stopped successfully.');
  process.exit(0);
}

bootstrap().catch((err: unknown) => {
  console.error('[FATAL] Unhandled bootstrap error:', err);
  process.exit(1);
});
