import { NextRequest } from 'next/server'
import { connections } from '@/lib/chat-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const connectionId = crypto.randomUUID()
  let heartbeat: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    start(controller) {
      connections.set(connectionId, controller)

      // Send initial connection message
      const encoder = new TextEncoder()
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      )

      // Heartbeat to keep connection alive
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          if (heartbeat) clearInterval(heartbeat)
          connections.delete(connectionId)
        }
      }, 30000)
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      connections.delete(connectionId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
