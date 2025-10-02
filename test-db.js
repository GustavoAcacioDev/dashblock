// Quick database connection test
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing database connection...')

    // Try to count users
    const userCount = await prisma.user.count()
    console.log('✓ Database connected successfully!')
    console.log(`Found ${userCount} users in database`)

    // Test creating a user
    console.log('\nTesting user creation...')
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('test123', 10)

    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        password: hashedPassword,
        name: 'Test User',
      },
    })

    console.log('✓ User created successfully!')
    console.log('User ID:', user.id)

    // Clean up
    await prisma.user.delete({ where: { id: user.id } })
    console.log('✓ Test user cleaned up')

  } catch (error) {
    console.error('✗ Database test failed:')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

test()
