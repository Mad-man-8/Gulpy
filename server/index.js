// server.js
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

const PORT = process.env.PORT || 3000;

// ✅ Allowed front-end origins (CORS-like whitelist for WS)
const ALLOWED_ORIGINS = [
  "http://localhost:5173", // local dev
  "http://localhost:3000", // alt dev
  "https://gulpies.io",    // production site
  "https://www.gulpies.io" // production site
];

// -------------------------------
// Player + Game State
// -------------------------------
const players = {}; // { playerId: { x, y, score, colorHue } }

// For now, just random food dots
const foods = [];
const MAX_FOOD = 100;
function spawnFood() {
  return {
    id: uuidv4(),
    x: Math.floor(Math.random() * 5000 - 2500), // big map
    y: Math.floor(Math.random() * 5000 - 2500),
    value: 1
  };
}
for (let i = 0; i < MAX_FOOD; i++) {
  foods.push(spawnFood());
}

// -------------------------------
// WebSocket Server
// -------------------------------
const wss = new WebSocketServer({
  port: PORT,
  verifyClient: (info, done) => {
    const origin = info.origin;

    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      done(true);
    } else {
      console.log(`❌ Blocked WS connection from: ${origin}`);
      done(false, 401, "Unauthorized");
    }
  }
});

console.log(`✅ WebSocket server running on port ${PORT}`);

// -------------------------------
// Connection Handling
// -------------------------------
wss.on("connection", (ws) => {
  const playerId = uuidv4();

  players[playerId] = {
    id: playerId,
    x: 0,
    y: 0,
    score: 0,
    colorHue: Math.floor(Math.random() * 360),
  };

  console.log(`🎮 Player connected: ${playerId}`);

  // Send init message with ID + starting state
  ws.send(JSON.stringify({
    type: "init",
    playerId,
    foods,
  }));

  // Handle messages from this player
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "update") {
        // update player position + score
        if (players[playerId]) {
          players[playerId].x = data.x;
          players[playerId].y = data.y;
          if (data.score !== undefined) {
            players[playerId].score = data.score;
          }

          // Check food collision (simple circle check)
          for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dx = players[playerId].x - f.x;
            const dy = players[playerId].y - f.y;
            if (dx * dx + dy * dy < 30 * 30) {
              // player eats food
              players[playerId].score += f.value;
              foods.splice(i, 1);
              foods.push(spawnFood()); // respawn
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ Invalid message", err);
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    console.log(`👋 Player disconnected: ${playerId}`);
    delete players[playerId];
  });
});

// -------------------------------
// Broadcast Loop (30fps)
// -------------------------------
setInterval(() => {
  const state = JSON.stringify({
    type: "state",
    players,
    foods,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(state);
    }
  });
}, 1000 / 30);
