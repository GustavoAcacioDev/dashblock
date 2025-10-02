'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { io } from 'socket.io-client'
import DeploymentModal from './DeploymentModal'

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

type User = {
  id: string
  name?: string | null
  email?: string | null
}

export default function DashboardClient({
  initialServers,
  user,
}: {
  initialServers: Server[]
  user: User
}) {
  const [servers, setServers] = useState<Server[]>(initialServers)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerDesc, setNewServerDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdServer, setCreatedServer] = useState<Server | null>(null)

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin
    const socket = io(`${wsUrl}/client`, {
      path: '/api/ws',
    })

    socket.on('connect', () => {
      console.log('Connected to WebSocket')
      // Watch all user's servers
      servers.forEach((server) => {
        socket.emit('watch_server', { serverId: server.id })
      })
    })

    socket.on('server_update', (data: { serverId: string; status: string; playersOnline?: number | null }) => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === data.serverId
            ? { ...s, status: data.status, playersOnline: data.playersOnline ?? s.playersOnline }
            : s
        )
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServerName,
          description: newServerDesc,
        }),
      })

      const server = await response.json()

      if (response.ok) {
        setServers([server, ...servers])
        setCreatedServer(server)
        setNewServerName('')
        setNewServerDesc('')
        setShowAddModal(false)
      }
    } catch (error) {
      console.error('Error creating server:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setNewServerName('')
    setNewServerDesc('')
  }

  const closeDeploymentModal = () => {
    setCreatedServer(null)
  }

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this server?')) return

    try {
      const response = await fetch(`/api/servers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setServers(servers.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error('Error deleting server:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'starting':
        return 'bg-yellow-500'
      case 'stopping':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getConnectionBadge = (isConnected: boolean) => {
    if (isConnected) {
      return <span className="text-xs text-green-600">Agent Connected</span>
    }
    return <span className="text-xs text-red-600">Agent Disconnected</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashblock</h1>
            <p className="text-sm text-gray-600">Welcome, {user.name}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My Servers</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Server
          </button>
        </div>

        {/* Servers Grid */}
        {servers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">No servers yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add your first server
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server) => (
              <div
                key={server.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {server.name}
                    </h3>
                    <p className="text-sm text-gray-600">{server.description}</p>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      server.status
                    )}`}
                    title={server.status}
                  />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{server.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {server.serverType || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-medium">
                      {server.mcVersion || 'Unknown'}
                    </span>
                  </div>
                  {server.playersOnline !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Players:</span>
                      <span className="font-medium">
                        {server.playersOnline}/{server.maxPlayers || '?'}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    {getConnectionBadge(server.isConnected)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/server/${server.id}`}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white text-center rounded-md hover:bg-indigo-700"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => handleDeleteServer(server.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Add New Server</h3>
            <form onSubmit={handleAddServer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="My Minecraft Server"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newServerDesc}
                    onChange={(e) => setNewServerDesc(e.target.value)}
                    placeholder="Server description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deployment Modal */}
      {createdServer && (
        <DeploymentModal server={createdServer} onClose={closeDeploymentModal} />
      )}
    </div>
  )
}
