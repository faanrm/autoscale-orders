import os from 'os';
import { WorkerConfig } from '../types/order.types';

export function loadConfig(): WorkerConfig {
  return {
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
    redisQueue: process.env.REDIS_QUEUE || 'order_processing_queue',
    workerId: `${os.hostname()}-${process.pid}`,
    popTimeoutSec: parseInt(process.env.POP_TIMEOUT_SEC || '2', 10),
  };
}
