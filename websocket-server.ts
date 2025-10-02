import { createServer } from 'http'
import { initWebSocketServer, getIO } from './src/lib/websocket'

const port = parseInt(process.env.WS_PORT || '3001', 10)

const httpServer = createServer((req, res) => {
  // Handle command requests from Next.js API
  if (req.method === 'POST' && req.url === '/internal/command') {
    console.log('[WS] Received internal command request')
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { serverId, command } = JSON.parse(body)
        console.log(`[WS] Parsed command: ${command} for server: ${serverId}`)

        const io = getIO()

        if (!io) {
          console.error('[WS] WebSocket not initialized')
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'WebSocket not initialized' }))
          return
        }

        const agentNamespace = io.of('/agent')
        const room = `server:${serverId}`

        // Check how many sockets are in the room
        const sockets = agentNamespace.adapter.rooms.get(room)
        console.log(`[WS] Room ${room} has ${sockets ? sockets.size : 0} connected agents`)

        agentNamespace.to(room).emit('command', { command })
        console.log(`[WS] Emitted ${command} command to room ${room}`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('[WS] Error processing command:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket server running')
})

// Initialize WebSocket server
try {
  initWebSocketServer(httpServer)
  console.log('✓ WebSocket server initialized')
} catch (error: any) {
  console.error('✗ Failed to initialize WebSocket server:', error.message)
  process.exit(1)
}

httpServer.listen(port, () => {
  console.log(`> WebSocket server ready on http://localhost:${port}`)
  console.log('> Press Ctrl+C to stop')
})
