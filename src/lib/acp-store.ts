// Shared in-memory ACP store
// Using a module-level singleton so both the route handler and SSE stream share state
// across imports within one Next.js server process (Railway single instance)
import { ACPMessage } from '@/types';

export const messageStore: ACPMessage[] = [];
export const sseClients: Set<ReadableStreamDefaultController> = new Set();

export function broadcastToSSE(msg: ACPMessage) {
  for (const ctrl of sseClients) {
    try {
      ctrl.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
    } catch {
      sseClients.delete(ctrl);
    }
  }
}
