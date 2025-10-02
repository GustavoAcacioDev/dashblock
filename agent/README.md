# Dashblock Agent

The Dashblock Agent is a lightweight Node.js application that runs on your Minecraft server and connects it to the Dashblock platform for remote management.

## Installation

### 1. Install Node.js

Make sure you have Node.js installed on your server (version 14 or higher).

```bash
node --version
```

### 2. Copy Agent Files

Copy the `agent` folder to your server (can be anywhere, doesn't need to be in Minecraft folder).

### 3. Install Dependencies

```bash
cd agent
npm install
```

### 4. Configure Agent

1. Copy `agent-config.example.json` to `agent-config.json`
2. Fill in your configuration:

```json
{
  "agentKey": "your-agent-key-from-dashboard",
  "platformUrl": "wss://yourdomain.com",
  "minecraftPath": "/home/minecraft/server"
}
```

- **agentKey**: Get this from your Dashblock dashboard when creating a new server
- **platformUrl**: Your Dashblock platform URL (use `wss://` for production)
- **minecraftPath**: Absolute path to your Minecraft server directory

### 5. Run Agent

```bash
npm start
```

## Running as a Service

### Linux (systemd)

Create a service file at `/etc/systemd/system/dashblock-agent.service`:

```ini
[Unit]
Description=Dashblock Minecraft Agent
After=network.target

[Service]
Type=simple
User=minecraft
WorkingDirectory=/path/to/agent
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable dashblock-agent
sudo systemctl start dashblock-agent
sudo systemctl status dashblock-agent
```

### Windows

You can use tools like `NSSM` or `node-windows` to run the agent as a Windows service.

## Features

- ✅ Start/Stop Minecraft server remotely
- ✅ Real-time status updates
- ✅ Automatic server detection (Vanilla, Fabric, Forge, Paper, Spigot)
- ✅ Auto-reconnect if connection is lost
- ✅ Graceful server shutdown

## Troubleshooting

### Agent won't connect

1. Check your `agentKey` is correct
2. Verify `platformUrl` is accessible from your server
3. Check firewall settings
4. Look at agent logs for errors

### Server won't start

1. Verify `minecraftPath` is correct
2. Check that `server.jar` exists in Minecraft directory
3. Ensure Java is installed and in PATH
4. Check Minecraft server logs

## Security Notes

- Keep your `agent-config.json` secure
- Never share your `agentKey`
- Use WSS (secure WebSocket) in production
- Run agent with limited user permissions
