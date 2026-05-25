// Shared chat store for SSE connections
export interface ChatMessage {
  id: string
  playerName: string
  message: string
  timestamp: string
}

// Active SSE connections
export const connections = new Map<string, ReadableStreamDefaultController>()

// Broadcast message to all connected clients
export function broadcastMessage(data: ChatMessage) {
  const encoder = new TextEncoder()
  const message = `data: ${JSON.stringify(data)}\n\n`

  connections.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(message))
    } catch {
      // Connection might be closed, will be cleaned up
    }
  })
}

// Clean up dead connections
export function cleanupConnection(id: string) {
  connections.delete(id)
}
