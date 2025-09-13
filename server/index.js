import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;

// ✅ Allowed front-end origins (whitelist)
const ALLOWED_ORIGINS = [
  "http://localhost:5173", // local dev
  "http://localhost:3000", // alt dev
  "https://gulpies.io",   // production site
  "https://www.gulpies.io"    // production site
];

// Store all players in memory
const players = {}; // { playerId: { x, y, score, colorHue } }

// Create WebSocket server with origin verification
const wss = new WebSocketServer({
  port: PORT,
  verifyClient: (info, done) => {
    const origin = info.origin;

    // Allow if origin is whitelisted OR no origin (e.g., non-browser client)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      done(true);
    } else {
      console.log(`❌ Blocked WS connection from: ${origin}`);
      done(false, 401, "Unauthorized");
    }
  }
});

console.log(`✅ WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  players[playerId] = {
    x: 0,
    y: 0,
    score: 0,
    colorHue: Math.floor(Math.random() * 360),
  };

  // Send initial player ID
  ws.send(JSON.stringify({ type: 'init', playerId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'update') {
        players[playerId].x = data.x;
        players[playerId].y = data.y;
        if (data.score !== undefined) players[playerId].score = data.score;
      }
    } catch (err) {
      console.error('❌ Invalid message', err);
    }
  });

  ws.on('close', () => {
    delete players[playerId];
  });
});

// Broadcast state to all connected clients 30 times/sec
setInterval(() => {
  const state = JSON.stringify({ type: 'state', players });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(state);
    }
  });
}, 1000 / 30);
