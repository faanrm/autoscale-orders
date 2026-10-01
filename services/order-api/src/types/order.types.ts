export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderRequest {
  order_id?: string;
  customer_id: string;
  items: string[] | OrderItem[];
  total_amount: number;
  created_at?: number;
}

export interface OrderResponse {
  message: string;
  order_id: string;
  queue_position: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  redis: string;
  timestamp: number;
}

export interface QueueStatusResponse {
  queue_name: string;
  pending_orders: number;
  timestamp: number;
}

export interface ApiConfig {
  port: number;
  redisHost: string;
  redisPort: number;
  redisQueue: string;
}
