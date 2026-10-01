import Redis from 'ioredis';
import { WorkerConfig } from '../types/order.types';

export class RedisQueueService {
  private client: Redis;

  constructor(config: WorkerConfig) {
    this.client = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
  }

  public async connect(): Promise<void> {
    await this.client.connect();
  }

  public async popOrder(queueName: string, timeoutSec: number): Promise<string | null> {
    try {
      // BRPOP blocks up to timeoutSec seconds
      const result = await this.client.brpop(queueName, timeoutSec);
      if (result) {
        const [, payload] = result;
        return payload;
      }
      return null;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Error popping order from Redis queue: ${errorMessage}`);
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
