export interface OrderPayload {
  order_id: string;
  customer_id: string;
  items: string[];
  total_amount: number;
  created_at: number;
}

export type OrderProcessingStatus =
  | 'PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'STOCK_RESERVED'
  | 'SHIPPED'
  | 'FAILED';

export interface ProcessedOrderResult {
  order_id: string;
  status: OrderProcessingStatus;
  processed_by: string;
  duration_ms: number;
  processed_at: string;
}

export interface WorkerConfig {
  redisHost: string;
  redisPort: number;
  redisQueue: string;
  workerId: string;
  popTimeoutSec: number;
}
