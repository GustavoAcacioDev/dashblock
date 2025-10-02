# Testing Dashblock

Follow these steps to test the complete application end-to-end.

## Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database running (or use Prisma dev database)

## Step 1: Set up the Platform

### 1.1 Install Dependencies

```bash
npm install
cd agent && npm install && cd ..
```

### 1.2 Configure Environment

Ensure your `.env` file has:

```env
DATABASE_URL="your-postgresql-url"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

For quick testing with Prisma's dev database:

```bash
npx prisma dev
```

### 1.3 Set up Database

```bash
npm run db:push
npm run db:generate
```

### 1.4 Build and Start Platform

```bash
npm run build
npm run dev
```

The platform should be running at `http://localhost:3000`

## Step 2: Create an Account

1. Open `http://localhost:3000`
2. Click "Register" or go to `/register`
3. Create an account:
   - Name: Test User
   - Email: test@example.com
   - Password: password123

## Step 3: Add a Server

1. After login, you'll be on the dashboard
2. Click "Add Server"
3. Fill in:
   - Server Name: My Test Server
   - Description: Testing Dashblock
4. Click "Create Server"
5. **IMPORTANT:** Copy the agent key that appears (you won't see it again!)

## Step 4: Set up the Agent

### 4.1 Prepare Minecraft Server

You need a Minecraft server installed somewhere. For testing, you can:
- Use an existing server
- Install one locally
- Use a test server in a VM

Make sure you have:
- `server.jar` file
- Java installed

### 4.2 Configure Agent

1. Copy the `agent` folder to your Minecraft server (can be anywhere on the server)

```bash
# On your Minecraft server
cd /path/to/minecraft
cp -r /path/to/dashblock/agent ./dashblock-agent
cd dashblock-agent
```

2. Install agent dependencies:

```bash
npm install
```

3. Create `agent-config.json`:

```bash
cp agent-config.example.json agent-config.json
```

4. Edit `agent-config.json`:

```json
{
  "agentKey": "paste-your-agent-key-here",
  "platformUrl": "ws://your-platform-address:3000",
  "minecraftPath": "/absolute/path/to/minecraft/server"
}
```

For local testing:
- `platformUrl`: `ws://localhost:3000`
- `minecraftPath`: Full path to your Minecraft server directory

### 4.3 Start the Agent

```bash
npm start
```

You should see:
```
Dashblock Agent started
Minecraft path: /your/path
Connecting to platform...
Connected to Dashblock platform
Authenticated successfully!
```

## Step 5: Test Server Management

### 5.1 Check Dashboard

1. Go back to the dashboard (`http://localhost:3000/dashboard`)
2. You should see "Agent Connected" on your server card
3. The status should update in real-time

### 5.2 Start the Server

1. Click "Manage" on your server
2. Click "Start Server"
3. Watch the status change from "offline" → "starting" → "online"
4. Check the agent console - you should see the Minecraft server starting

### 5.3 Stop the Server

1. Click "Stop Server"
2. Watch the status change to "stopping" then "offline"

### 5.4 Real-time Updates

- Keep the dashboard open
- The server status should update automatically via WebSocket
- No need to refresh the page!

## Troubleshooting

### Agent Won't Connect

**Problem:** Agent shows "Connection error" or "Authentication failed"

**Solutions:**
1. Check `agentKey` is correct
2. Verify `platformUrl` is accessible from the agent
3. Check firewall settings
4. Ensure platform is running

### Server Won't Start

**Problem:** Status stays "offline" or "starting"

**Solutions:**
1. Check `minecraftPath` is correct
2. Verify `server.jar` exists in Minecraft directory
3. Ensure Java is installed and in PATH
4. Check agent console for errors
5. Check Minecraft server logs

### Dashboard Shows "Agent Disconnected"

**Solutions:**
1. Restart the agent
2. Check network connection
3. Verify agent is running (`npm start` in agent folder)
4. Check agent console for errors

### WebSocket Not Updating

**Solutions:**
1. Check browser console for errors
2. Verify custom server is running (not `next dev`)
3. Restart the platform

## Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Can create a server (get agent key)
- [ ] Can copy agent to Minecraft server
- [ ] Agent connects successfully
- [ ] Dashboard shows "Agent Connected"
- [ ] Can start Minecraft server
- [ ] Status updates in real-time
- [ ] Can stop Minecraft server
- [ ] Can see server details (type, version, port)
- [ ] Can delete a server
- [ ] Agent reconnects after disconnect
- [ ] Multiple servers can be managed

## Next Steps After Testing

If everything works:
1. ✅ Backend is solid
2. ✅ Agent system works
3. ✅ Real-time updates work
4. Now you can focus on improving the UI!

Suggested improvements:
- Add shadcn/ui components
- Real-time console logs
- Better server metrics visualization
- Player management
- File browser
