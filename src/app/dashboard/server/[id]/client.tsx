'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { io } from 'socket.io-client'

type Server = {
  id: string
  name: string
  description: string | null
  agentKey: string
  isConnected: boolean
  status: string
  serverType: string | null
  mcVersion: string | null
  port: number | null
  playersOnline: number | null
  maxPlayers: number | null
  lastSeen: Date | null
}

export default function ServerClient({ server: initialServer }: { server: Server }) {
  const [server, setServer] = useState<Server>(initialServer)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin
    const socket = io(`${wsUrl}/client`, {
      path: '/api/ws',
    })

    socket.on('connect', () => {
      socket.emit('watch_server', { serverId: server.id })
    })

    socket.on('server_update', (data: {
      serverId: string
      status: string
      playersOnline?: number | null
      mcVersion?: string | null
      serverType?: string | null
      port?: number | null
      maxPlayers?: number | null
    }) => {
      if (data.serverId === server.id) {
        setServer((prev) => ({
          ...prev,
          status: data.status,
          playersOnline: data.playersOnline ?? prev.playersOnline,
          mcVersion: data.mcVersion ?? prev.mcVersion,
          serverType: data.serverType ?? prev.serverType,
          port: data.port ?? prev.port,
          maxPlayers: data.maxPlayers ?? prev.maxPlayers,
        }))
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [server.id])

  const sendCommand = async (command: 'start' | 'stop' | 'restart') => {
    setLoading(command)

    try {
      const response = await fetch(`/api/servers/${server.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to send command')
      }
    } catch (error) {
      console.error('Error sending command:', error)
      alert('Failed to send command')
    } finally {
      setLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50'
      case 'starting':
        return 'text-yellow-600 bg-yellow-50'
      case 'stopping':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server Info Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Server Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    server.status
                  )}`}
                >
                  {server.status.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Connection</p>
                {server.isConnected ? (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-50">
                    CONNECTED
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium text-red-600 bg-red-50">
                    DISCONNECTED
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Server Type</p>
                <p className="font-medium">{server.serverType || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Minecraft Version</p>
                <p className="font-medium">{server.mcVersion || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Port</p>
                <p className="font-medium">{server.port || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Players Online</p>
                <p className="font-medium">
                  {server.playersOnline !== null
                    ? `${server.playersOnline}/${server.maxPlayers || '?'}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {server.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{server.description}</p>
              </div>
            )}

            {server.lastSeen && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  Last seen: {new Date(server.lastSeen).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Controls Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Controls</h2>

            {!server.isConnected ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  ⚠️ Agent is not connected. Please start the agent on your server.
                </p>
              </div>
            ) : null}

            <div className="space-y-3">
              <button
                onClick={() => sendCommand('start')}
                disabled={
                  loading === 'start' ||
                  !server.isConnected ||
                  server.status === 'online' ||
                  server.status === 'starting'
                }
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'start' ? 'Starting...' : 'Start Server'}
              </button>

              <button
                onClick={() => sendCommand('stop')}
                disabled={
                  loading === 'stop' ||
                  !server.isConnected ||
                  server.status === 'offline' ||
                  server.status === 'stopping'
                }
                className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'stop' ? 'Stopping...' : 'Stop Server'}
              </button>

              <button
                onClick={() => sendCommand('restart')}
                disabled={
                  loading === 'restart' ||
                  !server.isConnected ||
                  server.status === 'offline'
                }
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'restart' ? 'Restarting...' : 'Restart Server'}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-2">Agent Setup</h3>
              <p className="text-xs text-gray-600 mb-4">
                Install the agent on your server using this key:
              </p>
              <div className="bg-gray-100 p-3 rounded-md">
                <code className="text-xs break-all text-gray-800">
                  {server.agentKey}
                </code>
              </div>
              <Link
                href="/agent"
                className="mt-3 block text-sm text-indigo-600 hover:text-indigo-700"
              >
                Download Agent →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
