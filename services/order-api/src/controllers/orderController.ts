import { Request, Response } from "express";
import { RedisService } from "../services/redis.service";
import {
  HealthResponse,
  OrderRequest,
  OrderResponse,
  QueueStatusResponse,
} from "../types/order.types";

export class orderController {
  private redisService: RedisService;

  constructor(redisService: RedisService) {
    this.redisService = redisService;
  }

  public health = async (_req: Request, res: Response): Promise<void> => {
    const isRedisConnected = await this.redisService.ping();
    const resp: HealthResponse = {
      status: isRedisConnected ? "healthy" : "degraded",
      redis: isRedisConnected ? "connected" : "disconnected",
      timestamp: Math.floor(Date.now() / 1000),
    };
    res.status(isRedisConnected ? 200 : 503).json(resp);
  };

  public queueStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const pendingOrders = await this.redisService.getQueueLength();
      const resp: QueueStatusResponse = {
        queue_name: this.redisService.getQueueName(),
        pending_orders: pendingOrders,
        timestamp: Math.floor(Date.now() / 1000),
      };
      res.status(200).json(resp);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to fetch queue status: ${msg}`);
      res.status(500).json({ error: msg });
    }
  };

  public createOrder = async (_req: Request, res: Response): Promise<void> => {
    try {
      const body = _req.body as OrderRequest;
      if (!body.customer_id || body.total_amount === undefined) {
        res.status(400).json({ error: "Missing required fields: customer_id or total_amount" });
        return;
      }

      const orderId =
        body.order_id ||
        `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const orderCreated: OrderRequest = {
        ...body,
        order_id: orderId,
        created_at: Math.floor(Date.now() / 1000),
      };

      const queuePosition = await this.redisService.pushOrder(orderCreated);
      console.log(`[INFO] Order accepted: ID=${orderId}, QueuePosition=${queuePosition}`);

      const resp: OrderResponse = {
        message: "Order accepted for asynchronous processing",
        order_id: orderId,
        queue_position: queuePosition,
      };

      res.status(202).json(resp);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to submit order: ${msg}`);
      res.status(500).json({ error: `Ingestion error: ${msg}` });
    }
  };

  public metrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const queueLen = await this.redisService.getQueueLength();
      const prometheusMetrics = [
        "# HELP order_queue_length Number of pending orders in queue",
        "# TYPE order_queue_length gauge",
        `order_queue_length ${queueLen}`,
        "",
      ].join("\n");

      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(prometheusMetrics);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to generate metrics: ${msg}`);
      res.status(500).send("Metrics error");
    }
  };
}
