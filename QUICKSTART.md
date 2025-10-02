# Quick Start Guide

Get Dashblock running in 5 minutes!

## 1. Database Setup

You have two options:

### Option A: Use Prisma Dev Database (Easiest)

```bash
npx prisma dev
```

This starts a local PostgreSQL instance automatically.

### Option B: Use Your Own PostgreSQL

Update `.env` with your database URL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dashblock"
```

## 2. Initialize Database

```bash
npm run db:push
npm run db:generate
```

## 3. Build and Start

```bash
npm run build
npm run dev
```

The platform should now be running at [http://localhost:3000](http://localhost:3000)

## 4. Create Your Account

1. Open http://localhost:3000
2. Click "Register"
3. Create an account

## 5. Add a Server

1. Click "Add Server" in the dashboard
2. Give it a name
3. **Copy the agent key** (you won't see it again!)

## 6. Install the Agent

On your Minecraft server machine:

```bash
# Go to your Minecraft server directory
cd /path/to/minecraft

# Copy the agent folder from this repo
cp -r /path/to/dashblock/agent ./dashblock-agent
cd dashblock-agent

# Install dependencies
npm install

# Configure the agent
cp agent-config.example.json agent-config.json
```

Edit `agent-config.json`:

```json
{
  "agentKey": "paste-your-key-here",
  "platformUrl": "ws://localhost:3000",
  "minecraftPath": "/absolute/path/to/minecraft/server"
}
```

Start the agent:

```bash
npm start
```

## 7. Manage Your Server!

Go back to the dashboard and you should see:
- ✅ Agent Connected
- Server controls enabled
- Real-time status updates

Click "Manage" to start/stop your server!

---

## Troubleshooting

**"Agent Disconnected"**
- Check the agent is running
- Verify the `agentKey` is correct
- Check `platformUrl` is accessible

**"Cannot connect to database"**
- If using Prisma dev: run `npx prisma dev` first
- If using your own: check DATABASE_URL in `.env`

**Server won't start from dashboard**
- Check `minecraftPath` in agent config
- Verify `server.jar` exists
- Ensure Java is installed
- Look at agent console for errors

---

For detailed testing instructions, see [TESTING.md](TESTING.md)
