const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',  // For development, allow all origins; restrict later for production
  }
});

const PORT = process.env.PORT || 3001;

let players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create a new player with default state
  players[socket.id] = {
    x: Math.random() * 500,
    y: Math.random() * 500,
    size: 10,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
  };

  // Send current players to new player
  socket.emit('currentPlayers', players);

  // Notify all players about new player
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

  // Receive player movement
  socket.on('playerMove', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x += movementData.dx;
      players[socket.id].y += movementData.dy;

      // Broadcast updated position to everyone
      io.emit('playerMoved', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
