import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/servers/[id]/command - Send command to server
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { command } = body

    console.log(`[COMMAND] Received ${command} command for server ${id}`)

    if (!['start', 'stop', 'restart'].includes(command)) {
      console.log(`[COMMAND] Invalid command: ${command}`)
      return NextResponse.json({ error: 'Invalid command' }, { status: 400 })
    }

    // Verify server ownership
    const server = await prisma.server.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!server) {
      console.log(`[COMMAND] Server not found: ${id}`)
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    console.log(`[COMMAND] Server found: ${server.name}, connected: ${server.isConnected}`)

    if (!server.isConnected) {
      console.log(`[COMMAND] Agent not connected for server ${id}`)
      return NextResponse.json(
        { error: 'Server agent is not connected' },
        { status: 400 }
      )
    }

    // Send command to WebSocket server via internal HTTP endpoint
    const wsUrl = process.env.WS_INTERNAL_URL || 'http://localhost:3001'
    console.log(`[COMMAND] Sending ${command} to WebSocket server at ${wsUrl}/internal/command`)

    const response = await fetch(`${wsUrl}/internal/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId: id, command }),
    })

    console.log(`[COMMAND] WebSocket server response: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[COMMAND] WebSocket server error: ${errorText}`)
      throw new Error('Failed to send command to WebSocket server')
    }

    console.log(`[COMMAND] Command ${command} sent successfully to server ${id}`)
    return NextResponse.json({ success: true, command })
  } catch (error) {
    console.error('[COMMAND] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send command' },
      { status: 500 }
    )
  }
}
