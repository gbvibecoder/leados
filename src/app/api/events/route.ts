import { NextResponse } from 'next/server';
import { pipelineEvents } from '@backend/orchestrator/event-emitter';
import { verifyToken } from '@/lib/auth';

const MAX_DURATION_MS = 55000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(req: Request) {
  // SSE connections can't use Authorization header; read token from query param
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  let _userId: string | null = null;
  if (token) {
    const payload = verifyToken(token);
    _userId = payload?.userId || null;
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const startTime = Date.now();

      function send(type: string, data: any) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        } catch {
          // stream closed
        }
      }

      // Send initial heartbeat
      send('heartbeat', { timestamp: new Date().toISOString() });

      // Subscribe to pipeline events — only forward events belonging to this user
      const shouldForward = (data: any) => {
        // If no user auth, don't send any pipeline events
        if (!_userId) return false;
        // Check if event has a userId that matches
        if (data?.userId && data.userId !== _userId) return false;
        // If event has pipelineId, we trust it (pipeline was already user-scoped at creation)
        return true;
      };

      const onAgentStarted = (data: any) => { if (shouldForward(data)) send('agent:started', data); };
      const onAgentProgress = (data: any) => { if (shouldForward(data)) send('agent:progress', data); };
      const onAgentCompleted = (data: any) => { if (shouldForward(data)) send('agent:completed', data); };
      const onAgentError = (data: any) => { if (shouldForward(data)) send('agent:error', data); };
      const onPipelineCompleted = (data: any) => { if (shouldForward(data)) send('pipeline:completed', data); };

      pipelineEvents.on('agent:started', onAgentStarted);
      pipelineEvents.on('agent:progress', onAgentProgress);
      pipelineEvents.on('agent:completed', onAgentCompleted);
      pipelineEvents.on('agent:error', onAgentError);
      pipelineEvents.on('pipeline:completed', onPipelineCompleted);

      function cleanup() {
        pipelineEvents.off('agent:started', onAgentStarted);
        pipelineEvents.off('agent:progress', onAgentProgress);
        pipelineEvents.off('agent:completed', onAgentCompleted);
        pipelineEvents.off('agent:error', onAgentError);
        pipelineEvents.off('pipeline:completed', onPipelineCompleted);
      }

      // Heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          if (Date.now() - startTime > MAX_DURATION_MS) {
            clearInterval(heartbeat);
            cleanup();
            send('reconnect', { reason: 'timeout' });
            controller.close();
            return;
          }
          send('heartbeat', { timestamp: new Date().toISOString() });
        } catch {
          clearInterval(heartbeat);
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Safety: close stream after max duration
      setTimeout(() => {
        clearInterval(heartbeat);
        cleanup();
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
