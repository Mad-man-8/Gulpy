import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';   // Correct
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js'; // make sure the .js extension is included

const PORT = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store all players in memory
const players = {}; // { playerId: { x, y, score, colorHue } }

// Serve static files (React build)
app.use("/chat", express.static(path.join(__dirname, "../client/chat")));

// Optional catch-all for frontend routing
app.get("/chat/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/chat/index.html"));
});

// Use your routes
app.use(routes);

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// ws server - attached to http server
const wss = new WebSocketServer({ server }); // <-- NO port here
console.log(`WebSocket server running on port ${PORT}`);

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
      console.error('Invalid message', err);
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
