import { Server as IOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { prisma } from './prisma'

export type AgentSocket = {
  serverId: string
  authenticated: boolean
}

let io: IOServer | undefined

export const initWebSocketServer = (httpServer: HTTPServer) => {
  if (io) return io

  io = new IOServer(httpServer, {
    path: '/api/ws',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  // Namespace for agent connections
  const agentNamespace = io.of('/agent')

  agentNamespace.on('connection', (socket) => {
    console.log('Agent attempting to connect:', socket.id)

    const agentData: AgentSocket = {
      serverId: '',
      authenticated: false,
    }

    // Agent must authenticate first
    socket.on('authenticate', async (data: { agentKey: string }) => {
      try {
        const server = await prisma.server.findUnique({
          where: { agentKey: data.agentKey },
        })

        if (!server) {
          socket.emit('auth_error', { message: 'Invalid agent key' })
          socket.disconnect()
          return
        }

        agentData.serverId = server.id
        agentData.authenticated = true

        // Update server connection status
        await prisma.server.update({
          where: { id: server.id },
          data: { isConnected: true, lastSeen: new Date() },
        })

        socket.emit('authenticated', { serverId: server.id })
        console.log(`[WS] Agent authenticated for server: ${server.name} (ID: ${server.id})`)

        // Join a room for this specific server
        socket.join(`server:${server.id}`)
        console.log(`[WS] Agent joined room: server:${server.id}`)
      } catch (error) {
        console.error('Authentication error:', error)
        socket.emit('auth_error', { message: 'Authentication failed' })
        socket.disconnect()
      }
    })

    // Receive status updates from agent
    socket.on('status_update', async (data: {
      status: 'offline' | 'starting' | 'online' | 'stopping'
      playersOnline?: number
      mcVersion?: string
      serverType?: string
      port?: number
      maxPlayers?: number
    }) => {
      if (!agentData.authenticated) return

      try {
        await prisma.server.update({
          where: { id: agentData.serverId },
          data: {
            status: data.status,
            playersOnline: data.playersOnline,
            mcVersion: data.mcVersion,
            serverType: data.serverType,
            port: data.port,
            maxPlayers: data.maxPlayers,
            lastSeen: new Date(),
          },
        })

        // Broadcast to web clients watching this server
        io?.of('/client').to(`server:${agentData.serverId}`).emit('server_update', {
          serverId: agentData.serverId,
          ...data,
        })
      } catch (error: any) {
        if (error.code === 'P2025') {
          // Server was deleted, disconnect the agent
          console.log(`[WS] Server ${agentData.serverId} was deleted, disconnecting agent`)
          socket.disconnect()
        } else {
          console.error('[WS] Status update error:', error)
        }
      }
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (agentData.authenticated) {
        try {
          await prisma.server.update({
            where: { id: agentData.serverId },
            data: { isConnected: false, lastSeen: new Date() },
          })
          console.log(`[WS] Agent disconnected for server: ${agentData.serverId}`)
        } catch (error: any) {
          if (error.code !== 'P2025') {
            // Ignore if server was deleted
            console.error('[WS] Disconnect update error:', error)
          }
        }
      }
    })
  })

  // Namespace for web client connections
  const clientNamespace = io.of('/client')

  clientNamespace.on('connection', (socket) => {
    console.log('Web client connected:', socket.id)

    // Allow clients to subscribe to specific server updates
    socket.on('watch_server', (data: { serverId: string }) => {
      socket.join(`server:${data.serverId}`)
    })

    socket.on('unwatch_server', (data: { serverId: string }) => {
      socket.leave(`server:${data.serverId}`)
    })
  })

  return io
}

// Send command to agent
export const sendCommandToAgent = async (
  serverId: string,
  command: 'start' | 'stop' | 'restart',
  data?: unknown
) => {
  if (!io) throw new Error('WebSocket server not initialized')

  const agentNamespace = io.of('/agent')
  const room = `server:${serverId}`

  agentNamespace.to(room).emit('command', {
    command,
    data,
  })
}

export const getIO = () => io
