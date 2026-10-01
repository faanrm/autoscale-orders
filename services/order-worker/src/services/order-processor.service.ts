import { OrderPayload, ProcessedOrderResult } from "../types/order.types";

export class OrderProcessorService {
  private workerId: string;

  constructor(workerId: string) {
    this.workerId = workerId;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async process(rawPayload: string): Promise<ProcessedOrderResult> {
    const startTime = Date.now();
    let order: OrderPayload;

    try {
      order = JSON.parse(rawPayload);
    } catch {
      order = {
        order_id: rawPayload,
        customer_id: "unknown_customer",
        items: [],
        total_amount: 0,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const orderId = order.order_id || "UNKNOWN_ID";
    const amount = order.total_amount ? `${order.total_amount} Ar` : "N/A";

    console.log(
      `[${new Date().toISOString()}] [${this.workerId}] [START] Order received: ${orderId} (${amount})`,
    );

    await this.sleep(600);
    console.log(
      `[${new Date().toISOString()}] [${this.workerId}] [PAYMENT] Payment authorized for ${orderId}`,
    );

    await this.sleep(700);
    console.log(
      `[${new Date().toISOString()}] [${this.workerId}] [WAREHOUSE] Inventory reserved and shipping label printed for ${orderId}`,
    );

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [${this.workerId}] [SUCCESS] Order ${orderId} completed in ${duration}ms!`,
    );

    return {
      order_id: orderId,
      status: "SHIPPED",
      processed_by: this.workerId,
      duration_ms: duration,
      processed_at: new Date().toISOString(),
    };
  }
}
