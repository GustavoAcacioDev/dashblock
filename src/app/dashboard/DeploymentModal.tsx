'use client'

import { useState, FormEvent } from 'react'

type Server = {
  id: string
  agentKey: string
  name: string
}

type DeploymentStep = 'info' | 'ssh' | 'deploying' | 'done'

interface Props {
  server: Server | null
  onClose: () => void
}

export default function DeploymentModal({ server, onClose }: Props) {
  const [step, setStep] = useState<DeploymentStep>('info')
  const [loading, setLoading] = useState(false)

  // SSH credentials
  const [sshHost, setSshHost] = useState('')
  const [sshPort, setSshPort] = useState('22')
  const [sshUsername, setSshUsername] = useState('root')
  const [sshPrivateKey, setSshPrivateKey] = useState('')
  const [minecraftPath, setMinecraftPath] = useState('/home/minecraft/server')
  const [deploymentMessage, setDeploymentMessage] = useState('')

  if (!server) return null

  const handleDeployAgent = async (e: FormEvent) => {
    e.preventDefault()
    setStep('deploying')
    setLoading(true)

    try {
      const response = await fetch(`/api/servers/${server.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sshHost,
          sshPort: parseInt(sshPort),
          sshUsername,
          sshPrivateKey,
          minecraftPath,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setDeploymentMessage(data.message)
        setStep('done')
        setSshPrivateKey('') // Clear sensitive data
      } else {
        setDeploymentMessage(data.error || 'Deployment failed')
        setStep('ssh')
      }
    } catch (error) {
      console.error('Deployment error:', error)
      setDeploymentMessage('Failed to deploy agent. Please check your SSH credentials.')
      setStep('ssh')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Step 1: Show Agent Key */}
        {step === 'info' && (
          <>
            <h3 className="text-xl font-semibold mb-4 text-green-600">
              ✓ Server Created Successfully!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your server <strong>{server.name}</strong> has been created. Now let&apos;s deploy the agent to manage it remotely.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-sm font-semibold text-blue-900 mb-2">Agent Key (save this!):</p>
              <code className="text-xs break-all bg-white p-2 rounded block">{server.agentKey}</code>
            </div>
            <button
              onClick={() => setStep('ssh')}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Continue to Setup
            </button>
          </>
        )}

        {/* Step 2: SSH Credentials */}
        {step === 'ssh' && (
          <>
            <h3 className="text-xl font-semibold mb-4">Deploy Agent via SSH</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your server&apos;s SSH credentials. We&apos;ll automatically install and configure the agent for you.
            </p>
            <form onSubmit={handleDeployAgent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SSH Host/IP *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    placeholder="192.168.1.100 or example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SSH Port
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={sshPort}
                    onChange={(e) => setSshPort(e.target.value)}
                    placeholder="22"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    placeholder="root"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Private Key *
                  </label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                    value={sshPrivateKey}
                    onChange={(e) => setSshPrivateKey(e.target.value)}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEpAIBAAKCAQEA...&#10;-----END RSA PRIVATE KEY-----"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste your SSH private key (e.g., contents of ~/.ssh/id_rsa)
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minecraft Server Path *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={minecraftPath}
                    onChange={(e) => setMinecraftPath(e.target.value)}
                    placeholder="/home/minecraft/server"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Full path to the directory containing server.jar
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Requirements:</strong> Node.js 14+ must be installed on your server
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Deploy Agent
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Deploying */}
        {step === 'deploying' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">Deploying Agent...</h3>
            <p className="text-gray-600 text-sm">
              This may take a minute. We&apos;re installing the agent on your server.
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <>
            <h3 className="text-xl font-semibold mb-4 text-green-600">
              ✓ Agent Deployed Successfully!
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-sm text-green-800">{deploymentMessage}</p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Your agent is now running on the server and connected to Dashblock. You can now manage your Minecraft server from the dashboard!
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
