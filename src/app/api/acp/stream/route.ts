import { NextRequest } from 'next/server';
import { sseClients } from '@/lib/acp-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      sseClients.add(ctrl);
      // Keep-alive ping every 25s to prevent Railway from closing idle connections
      const keepAlive = setInterval(() => {
        try {
          ctrl.enqueue(': keep-alive\n\n');
        } catch {
          clearInterval(keepAlive);
        }
      }, 25_000);
    },
    cancel() {
      sseClients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
