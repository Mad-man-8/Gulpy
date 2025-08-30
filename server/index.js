import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;

// Store all players in memory
const players = {}; // { playerId: { x, y, score, colorHue } }

const wss = new WebSocketServer({ port: PORT });
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
