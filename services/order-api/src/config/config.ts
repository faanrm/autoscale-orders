import { ApiConfig } from "../types/order.types";
export function loadConfig ():ApiConfig{
    return {
        port : parseInt(process.env.PORT || '4000',10),
        redisHost : process.env.REDIS_HOST || 'localhost',
        redisPort : parseInt(process.env.REDIS_PORT || "6379",10),
        redisQueue : process.env.REDIS_QUEUE || 'order_processing_queue'
    }
}