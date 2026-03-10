import { NextResponse } from 'next/server';

// On Vercel serverless, SSE connections must close before the timeout (300s).
// Use short-lived connections that clients reconnect to automatically.
const MAX_DURATION_MS = 55000; // 55 seconds — well under Vercel's limit
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const startTime = Date.now();

      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'heartbeat', data: { timestamp: new Date().toISOString() } })}\n\n`
        )
      );

      // Heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          // Close stream before Vercel timeout
          if (Date.now() - startTime > MAX_DURATION_MS) {
            clearInterval(heartbeat);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'reconnect', data: { reason: 'timeout' } })}\n\n`
              )
            );
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'heartbeat', data: { timestamp: new Date().toISOString() } })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Safety: close stream after max duration
      setTimeout(() => {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, MAX_DURATION_MS);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
