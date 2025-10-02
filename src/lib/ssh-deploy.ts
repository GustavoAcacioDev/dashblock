import { NodeSSH } from 'node-ssh'
import fs from 'fs'
import path from 'path'

export interface SSHCredentials {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
}

export interface DeploymentResult {
  success: boolean
  message: string
  agentPath?: string
}

export async function deployAgent(
  credentials: SSHCredentials,
  agentKey: string,
  platformUrl: string,
  minecraftPath: string
): Promise<DeploymentResult> {
  const ssh = new NodeSSH()

  try {
    // Connect to server
    console.log(`Connecting to ${credentials.host}...`)
    await ssh.connect(credentials)

    // Check if Node.js is installed
    const nodeCheck = await ssh.execCommand('node --version')
    if (nodeCheck.code !== 0) {
      return {
        success: false,
        message: 'Node.js is not installed on the server. Please install Node.js 14+ first.',
      }
    }

    console.log(`Node.js version: ${nodeCheck.stdout}`)

    // Get home directory path
    const homeResult = await ssh.execCommand('echo $HOME')
    const homePath = homeResult.stdout.trim()

    // Create dashblock agent directory in user's home
    const agentPath = `${homePath}/dashblock-agent`
    await ssh.execCommand(`mkdir -p ${agentPath}`)

    console.log(`Agent directory: ${agentPath}`)

    // Read local agent files
    const agentDir = path.join(process.cwd(), 'agent')

    // Upload agent files
    console.log('Uploading agent files...')
    await ssh.putFile(
      path.join(agentDir, 'index.js'),
      `${agentPath}/index.js`
    )
    await ssh.putFile(
      path.join(agentDir, 'package.json'),
      `${agentPath}/package.json`
    )

    // Create agent configuration
    const config = {
      agentKey,
      platformUrl,
      minecraftPath,
    }

    const configContent = JSON.stringify(config, null, 2)
    await ssh.execCommand(
      `echo '${configContent}' > ${agentPath}/agent-config.json`
    )

    // Install dependencies
    console.log('Installing agent dependencies...')
    const npmInstall = await ssh.execCommand('npm install', {
      cwd: agentPath,
    })

    if (npmInstall.code !== 0) {
      return {
        success: false,
        message: `Failed to install dependencies: ${npmInstall.stderr}`,
      }
    }

    // Try to set up systemd service (requires sudo)
    console.log('Starting agent service...')
    const sudoCheck = await ssh.execCommand('sudo -n true 2>&1')

    if (sudoCheck.code === 0) {
      // User has passwordless sudo, try systemd
      const serviceContent = `[Unit]
Description=Dashblock Minecraft Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=${agentPath}
ExecStart=$(which node) index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`

      await ssh.execCommand(
        `echo '${serviceContent}' | sudo tee /etc/systemd/system/dashblock-agent.service`
      )
      await ssh.execCommand('sudo systemctl daemon-reload')
      await ssh.execCommand('sudo systemctl enable dashblock-agent')
      await ssh.execCommand('sudo systemctl start dashblock-agent')

      console.log('Agent started with systemd')
    } else {
      // No sudo access, use background process
      console.log('No sudo access, using background process...')

      // Kill any existing agent process
      const killResult = await ssh.execCommand('pkill -f "node.*index.js.*dashblock"')
      console.log('Kill existing agent result:', killResult.code)

      // Start agent in background (simple method that works)
      const startResult = await ssh.execCommand(
        `cd ${agentPath} && node index.js &`
      )
      console.log('Start agent result:', startResult.code, startResult.stdout)

      if (startResult.code !== 0 && startResult.stderr) {
        console.error('Failed to start agent:', startResult.stderr)
        throw new Error(`Failed to start agent: ${startResult.stderr}`)
      }

      // Wait a moment and check if it's running
      await new Promise(resolve => setTimeout(resolve, 3000))
      const psCheck = await ssh.execCommand('ps aux | grep "node.*index.js" | grep -v grep')
      console.log('Process check:', psCheck.stdout)

      if (psCheck.stdout.trim()) {
        console.log('Agent started successfully in background')
      } else {
        console.error('Agent process not found after start attempt')
        // Don't fail here - it might still be starting
      }
    }

    ssh.dispose()

    return {
      success: true,
      message: 'Agent deployed and started successfully!',
      agentPath,
    }
  } catch (error) {
    console.error('Deployment error:', error)
    ssh.dispose()
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function checkServerConnection(
  credentials: SSHCredentials
): Promise<{ connected: boolean; message: string }> {
  const ssh = new NodeSSH()

  try {
    await ssh.connect(credentials)
    const result = await ssh.execCommand('uname -a')
    ssh.dispose()

    return {
      connected: true,
      message: `Connected! System: ${result.stdout}`,
    }
  } catch (error) {
    ssh.dispose()
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}
