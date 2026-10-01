import { Router } from 'express';
import { orderController } from '../controllers/orderController';


export function createOrderRouter(controller: orderController): Router {
  const router = Router();

  router.get('/health', controller.health);
  router.get('/queue-status', controller.queueStatus);
  router.post('/orders', controller.createOrder);
  router.get('/metrics', controller.metrics);

  return router;
}
