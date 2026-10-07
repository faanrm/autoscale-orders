#!/usr/bin/env node
/**
 * Order Surge Traffic Simulator 
 * Tests auto-scaling and Scale-to-Zero driven by KEDA.
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:8080';
const ORDER_COUNT = parseInt(process.argv[2] || '20', 10);
const DELAY_MS = parseInt(process.argv[3] || '100', 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function postOrder(orderId, customerId, amount) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      order_id: orderId,
      customer_id: customerId,
      items: ['Product-A', 'Product-B'],
      total_amount: amount,
    });

    const url = new URL(`${API_URL}/orders`);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 3000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ message: data });
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getQueueStatus() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/queue-status`);
    http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('ORDER SURGE SIMULATION (EVENING PEAK WAVE)');
  console.log('='.repeat(70));
  console.log(`API URL       : ${API_URL}`);
  console.log(`Total Orders  : ${ORDER_COUNT}`);
  console.log(`Delay         : ${DELAY_MS} ms`);
  console.log('-'.repeat(70));

  try {
    const initial = await getQueueStatus();
    console.log(`[*] Initial Redis queue status: ${initial.pending_orders} pending order(s).`);
  } catch (err) {
    console.error(`[!] Unable to reach API at ${API_URL}: ${err.message}`);
    console.error('[!] Please make sure the order-api container/pod is running.');
    process.exit(1);
  }

  console.log('\nDispatching order surge wave...');
  for (let i = 1; i <= ORDER_COUNT; i++) {
    const orderId = `CMD-${Date.now()}-${String(i).padStart(3, '0')}`;
    const customer = `customer_${(i % 5) + 1}`;
    const amount = parseFloat((Math.random() * 80 + 15).toFixed(2));

    try {
      const res = await postOrder(orderId, customer, amount);
      console.log(`  -> [${String(i).padStart(2, '0')}/${ORDER_COUNT}] Order submitted: ${orderId} (Queue pos: ${res.queue_position})`);
    } catch (err) {
      console.error(`  [x] Failed to submit ${orderId}: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL ORDERS INJECTED INTO REDIS QUEUE!');
  console.log('='.repeat(70));
  console.log('Observe live KEDA auto-scaling using:');
  console.log('   watch kubectl get pods -n projet-examen -l app=order-worker');
  console.log('='.repeat(70));

  console.log('\nMonitoring queue drain by workers...');
  for (let step = 0; step < 20; step++) {
    try {
      const st = await getQueueStatus();
      const pending = st.pending_orders;
      const bar = '█'.repeat(Math.min(pending, 40));
      console.log(`  [Queue] Remaining orders: ${String(pending).padStart(2, '0')} | ${bar}`);
      if (pending === 0) {
        console.log('\nQueue is completely empty! KEDA is initiating Scale-to-Zero.');
        break;
      }
    } catch {
      // Ignore
    }
    await sleep(2000);
  }
}

main();
