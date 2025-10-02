const { io } = require('socket.io-client');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = 'agent-config.json';
let config = {};

// Load configuration
try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } else {
    console.error('Configuration file not found. Please create agent-config.json');
    console.error('Example: { "agentKey": "your-agent-key", "platformUrl": "ws://localhost:3000", "minecraftPath": "/path/to/minecraft" }');
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading config:', error);
  process.exit(1);
}

const { agentKey, platformUrl, minecraftPath } = config;

if (!agentKey || !platformUrl || !minecraftPath) {
  console.error('Missing required configuration: agentKey, platformUrl, or minecraftPath');
  process.exit(1);
}

// Minecraft server process
let mcProcess = null;
let currentStatus = 'offline';

// Connect to platform
const socket = io(`${platformUrl}/agent`, {
  path: '/api/ws',
  reconnection: true,
  reconnectionDelay: 5000,
  reconnectionAttempts: Infinity,
});

socket.on('connect', () => {
  console.log('Connected to Dashblock platform');

  // Authenticate
  socket.emit('authenticate', { agentKey });
});

socket.on('authenticated', (data) => {
  console.log('Authenticated successfully!', data);

  // Check initial server status
  checkServerStatus();

  // Send status updates every 10 seconds
  setInterval(() => {
    sendStatusUpdate();
  }, 10000);
});

socket.on('auth_error', (data) => {
  console.error('Authentication failed:', data.message);
  process.exit(1);
});

socket.on('command', (data) => {
  console.log('Received command:', data.command);

  switch (data.command) {
    case 'start':
      startServer();
      break;
    case 'stop':
      stopServer();
      break;
    case 'restart':
      restartServer();
      break;
    default:
      console.log('Unknown command:', data.command);
  }
});

socket.on('disconnect', () => {
  console.log('Disconnected from platform. Reconnecting...');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Check if server is running
function checkServerStatus() {
  if (process.platform === 'win32') {
    exec('tasklist', (error, stdout) => {
      if (error) {
        console.error('Error checking server status:', error);
        return;
      }

      const isRunning = stdout.toLowerCase().includes('java.exe');
      currentStatus = isRunning ? 'online' : 'offline';
      sendStatusUpdate();
    });
  } else {
    exec(`ps aux | grep java | grep server.jar | grep -v grep`, (error, stdout) => {
      const isRunning = stdout.trim().length > 0;
      currentStatus = isRunning ? 'online' : 'offline';
      sendStatusUpdate();
    });
  }
}

// Send status update to platform
function sendStatusUpdate() {
  const status = {
    status: currentStatus,
  };

  // Try to read server.properties for additional info
  const propsPath = path.join(minecraftPath, 'server.properties');
  if (fs.existsSync(propsPath)) {
    try {
      const props = fs.readFileSync(propsPath, 'utf8');
      const portMatch = props.match(/server-port=(\d+)/);
      const maxPlayersMatch = props.match(/max-players=(\d+)/);

      if (portMatch) status.port = parseInt(portMatch[1]);
      if (maxPlayersMatch) status.maxPlayers = parseInt(maxPlayersMatch[1]);
    } catch (error) {
      console.error('Error reading server.properties:', error);
    }
  }

  // Detect server type
  const jarFiles = fs.readdirSync(minecraftPath).filter(f => f.endsWith('.jar'));
  if (jarFiles.some(f => f.includes('fabric'))) {
    status.serverType = 'fabric';
  } else if (jarFiles.some(f => f.includes('forge'))) {
    status.serverType = 'forge';
  } else if (jarFiles.some(f => f.includes('paper'))) {
    status.serverType = 'paper';
  } else if (jarFiles.some(f => f.includes('spigot'))) {
    status.serverType = 'spigot';
  } else {
    status.serverType = 'vanilla';
  }

  socket.emit('status_update', status);
}

// Start Minecraft server
function startServer() {
  if (currentStatus === 'online' || currentStatus === 'starting') {
    console.log('Server is already running or starting');
    return;
  }

  currentStatus = 'starting';
  sendStatusUpdate();

  console.log('Starting Minecraft server...');

  // Check if start.sh exists (preferred method)
  const startScriptPath = path.join(minecraftPath, 'start.sh');
  if (fs.existsSync(startScriptPath)) {
    console.log('Found start.sh script, using it to start server');

    mcProcess = spawn('bash', ['start.sh'], {
      cwd: minecraftPath,
      stdio: 'pipe'
    });

    console.log('Started server using start.sh with PID:', mcProcess.pid);
  } else {
    // Fallback: Find and run JAR directly
    const jarFiles = fs.readdirSync(minecraftPath).filter(f =>
      f.endsWith('.jar') && !f.includes('forge-installer')
    );

    console.log('Found JAR files:', jarFiles);

    if (jarFiles.length === 0) {
      console.error('No server JAR file found in', minecraftPath);
      currentStatus = 'offline';
      sendStatusUpdate();
      return;
    }

    const serverJar = jarFiles[0];
    console.log('Using JAR file:', serverJar);

    const javaArgs = [
      '-Xmx2G',
      '-Xms1G',
      '-jar',
      serverJar,
      'nogui'
    ];

    console.log('Starting Java with args:', javaArgs.join(' '));

    mcProcess = spawn('java', javaArgs, {
      cwd: minecraftPath,
      stdio: 'pipe'
    });

    console.log('Java process spawned with PID:', mcProcess.pid);
  }

  mcProcess.stdout.on('data', (data) => {
    const output = data.toString();

    // Check for server ready message
    if (output.includes('Done') && output.includes('For help, type "help"')) {
      currentStatus = 'online';
      sendStatusUpdate();
      console.log('Server started successfully');
    }
  });

  mcProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('Server stderr:', error);
  });

  mcProcess.on('error', (error) => {
    console.error('Failed to start server process:', error.message);
    currentStatus = 'offline';
    sendStatusUpdate();
  });

  mcProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0) {
      console.error('Server crashed or failed to start');
    }
    mcProcess = null;
    currentStatus = 'offline';
    sendStatusUpdate();
  });
}

// Stop Minecraft server
function stopServer() {
  if (currentStatus === 'offline' || currentStatus === 'stopping') {
    console.log('Server is not running');
    return;
  }

  currentStatus = 'stopping';
  sendStatusUpdate();

  console.log('Stopping Minecraft server...');

  if (mcProcess) {
    // Send stop command
    mcProcess.stdin.write('stop\n');

    // Force kill after 30 seconds if still running
    setTimeout(() => {
      if (mcProcess) {
        console.log('Force killing server process');
        mcProcess.kill();
      }
    }, 30000);
  } else {
    // If we don't have a process handle, try to kill via system command
    if (process.platform === 'win32') {
      exec('taskkill /F /IM java.exe', (error) => {
        if (error) console.error('Error killing process:', error);
        currentStatus = 'offline';
        sendStatusUpdate();
      });
    } else {
      exec(`pkill -f "java.*server.jar"`, (error) => {
        if (error) console.error('Error killing process:', error);
        currentStatus = 'offline';
        sendStatusUpdate();
      });
    }
  }
}

// Restart server
function restartServer() {
  console.log('Restarting Minecraft server...');
  stopServer();

  // Wait for server to stop, then start
  setTimeout(() => {
    startServer();
  }, 5000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Agent shutting down...');
  stopServer();
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Agent shutting down...');
  stopServer();
  socket.disconnect();
  process.exit(0);
});

console.log('Dashblock Agent started');
console.log('Minecraft path:', minecraftPath);
console.log('Connecting to platform...');
