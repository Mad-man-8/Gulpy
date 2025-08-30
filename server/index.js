// index.js
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;

const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server running on port ${PORT}`);

const players = {};

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  players[playerId] = {
    x: 0,
    y: 0,
    score: 0,
    colorHue: Math.floor(Math.random() * 360),
  };

  ws.send(JSON.stringify({ type: 'init', playerId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'update') {
        players[playerId].x = data.x;
        players[playerId].y = data.y;
        if (data.score !== undefined) players[playerId].score = data.score;
      }
    } catch (e) {
      console.error('Invalid message', e);
    }
  });

  ws.on('close', () => {
    delete players[playerId];
  });
});

setInterval(() => {
  const state = JSON.stringify({ type: 'state', players });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(state);
    }
  });
}, 1000 / 30);
