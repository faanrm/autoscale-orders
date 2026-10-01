import Redis from "ioredis";
import { ApiConfig, OrderRequest } from "../types/order.types";

export class RedisService {
  private client: Redis;
  private queue: string;
  constructor(config: ApiConfig) {
    this.queue = config.redisQueue;
    this.client = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
  }
  public async connect():Promise<void>{
    await this.client.connect();
  }
  public async ping():Promise<boolean>{
    try {
     const res =await this.client.ping()
     return res === "PONG";
    } catch (error) {
        return false
    }
  }
  public async pushOrder(order : OrderRequest): Promise<number>{
    const payload = JSON.stringify({
        order_id  : order.order_id,
        customer_id : order.customer_id,
        items : order.items,
        total_amout : order.total_amount,
        created_at : order.created_at || Math.floor(Date.now()/1000)
    })
    return await this.client.rpush(this.queue,payload);
  }
  public  getQueueName():string {
    return this.queue
  }
  public async getQueueLength() : Promise<number>{
    return await this.client.llen(this.queue);
  }
  public async close () : Promise<void> {
    await this.client.quit();
  }
}
