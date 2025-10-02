import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import ServerClient from './client'

export default async function ServerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params

  const server = await prisma.server.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!server) {
    notFound()
  }

  return <ServerClient server={server} />
}
