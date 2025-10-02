import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deployAgent } from '@/lib/ssh-deploy'
import { encrypt } from '@/lib/crypto'

// Force Node.js runtime for SSH operations
export const runtime = 'nodejs'

// POST /api/servers/[id]/deploy - Deploy agent via SSH
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
    const { sshHost, sshPort, sshUsername, sshPrivateKey, minecraftPath } = body

    // Validate input
    if (!sshHost || !sshUsername || !sshPrivateKey || !minecraftPath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify server ownership
    const server = await prisma.server.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Get platform URL for agent connection
    const platformUrl = process.env.NEXT_PUBLIC_WS_URL ||
                       process.env.NEXTAUTH_URL?.replace('http', 'ws') ||
                       'ws://localhost:3001'

    // Deploy agent
    const result = await deployAgent(
      {
        host: sshHost,
        port: sshPort || 22,
        username: sshUsername,
        privateKey: sshPrivateKey,
      },
      server.agentKey,
      platformUrl,
      minecraftPath
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }

    // Encrypt and save SSH credentials
    const encryptedPrivateKey = encrypt(sshPrivateKey)

    await prisma.server.update({
      where: { id },
      data: {
        sshHost,
        sshPort: sshPort || 22,
        sshUsername,
        sshPrivateKey: encryptedPrivateKey,
        minecraftPath,
        agentDeployed: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: 'Failed to deploy agent' },
      { status: 500 }
    )
  }
}
