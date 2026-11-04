import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager(io);

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/rooms', (req, res) => {
  res.json(roomManager.listPublicRooms());
});

app.post('/api/rooms', (req, res) => {
  const { roomName, fillWithBots, turnTimerSeconds, maxPlayers, rules } = req.body || {};
  const room = roomManager.createRoom(roomName, { fillWithBots, turnTimerSeconds, maxPlayers, rules });
  res.json({
    roomId: room.id,
    roomName: room.name,
    fillWithBots: room.fillWithBots,
    maxPlayers: room.maxPlayers,
    rules: room.rules
  });
});

// Socket.io handlers
io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  socket.on('join_room', ({ roomId, playerName, avatar, playerId }) => {
    const code = (roomId || '').trim().toUpperCase();

    // Leave previous room if switching rooms
    if (currentRoomId && currentRoomId !== code) {
      const prevRoom = roomManager.getRoom(currentRoomId);
      if (prevRoom && currentPlayerId) {
        prevRoom.removePlayer(currentPlayerId);
        socket.leave(currentRoomId);
        if (prevRoom.state.players.length === 0 || prevRoom.state.players.every(p => p.isBot || !p.connected)) {
          roomManager.deleteRoom(currentRoomId);
        }
      }
    }

    let room = roomManager.getRoom(code);
    if (!room) {
      // Auto-create room if it doesn't exist so users can easily join any 4-letter code!
      room = roomManager.createRoom(`Meja ${code}`, { fillWithBots: true }, code);
    }

    const validPlayerId = playerId || `player_${socket.id.substring(0, 6)}`;
    currentRoomId = code;
    currentPlayerId = validPlayerId;
    (socket as any).playerId = validPlayerId;

    socket.join(code);

    const player = room.addPlayer(validPlayerId, playerName, avatar);
    if (!player) {
      socket.emit('error_message', `Meja sudah penuh (maksimal ${room.maxPlayers} pemain).`);
      return;
    }

    socket.emit('joined_room', {
      playerId: currentPlayerId,
      player,
      roomName: room.name,
      roomId: room.id
    });

    room.broadcastState();
  });

  socket.on('leave_room', ({ roomId, playerId }) => {
    const code = (roomId || currentRoomId || '').toUpperCase();
    const room = roomManager.getRoom(code);
    const pid = playerId || currentPlayerId;
    if (room && pid) {
      room.removePlayer(pid);
      socket.leave(code);
      if (code === currentRoomId) {
        currentRoomId = null;
        currentPlayerId = null;
      }
      if (room.state.players.length === 0 || room.state.players.every(p => p.isBot || !p.connected)) {
        roomManager.deleteRoom(code);
      }
    }
  });

  socket.on('start_game', ({ roomId }) => {
    const code = (roomId || currentRoomId || '').toUpperCase();
    const room = roomManager.getRoom(code);
    if (!room) return;

    const started = room.startGame();
    if (!started) {
      socket.emit('error_message', `Gagal memulai permainan. Butuh minimal 2 pemain (hingga maksimal ${room.maxPlayers} pemain).`);
    }
  });

  socket.on('play_cards', ({ roomId, playerId, cardIds }) => {
    const code = (roomId || currentRoomId || '').toUpperCase();
    const room = roomManager.getRoom(code);
    if (!room) return;

    const pid = playerId || currentPlayerId;
    if (!pid) return;

    const result = room.playCards(pid, cardIds);
    if (!result.success) {
      socket.emit('error_message', result.error || 'Langkah kartu tidak valid.');
    }
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    const code = (roomId || currentRoomId || '').toUpperCase();
    const room = roomManager.getRoom(code);
    if (!room) return;

    const pid = playerId || currentPlayerId;
    if (!pid) return;

    const result = room.passTurn(pid);
    if (!result.success) {
      socket.emit('error_message', result.error || 'Tidak dapat lewat saat ini.');
    }
  });

  socket.on('send_chat', ({ roomId, playerId, text }) => {
    const code = (roomId || currentRoomId || '').toUpperCase();
    const room = roomManager.getRoom(code);
    if (!room) return;

    const pid = playerId || currentPlayerId;
    if (!pid || !text) return;

    room.addChatMessage(pid, text);
  });

  socket.on('restart_game', ({ roomId }) => {
    const code = (roomId || currentRoomId || '').toUpperCase();
    const room = roomManager.getRoom(code);
    if (!room) return;

    room.resetForNextGame();
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentPlayerId) {
      const room = roomManager.getRoom(currentRoomId);
      if (room) {
        room.removePlayer(currentPlayerId);
        if (room.state.players.length === 0 || room.state.players.every(p => p.isBot || !p.connected)) {
          roomManager.deleteRoom(currentRoomId);
        }
      }
    }
  });
});

// Serve frontend in production
const clientDistPath = path.resolve(__dirname, '../../dist/client');
app.use(express.static(clientDistPath));

app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Poker Remi Game Server is running. Client build in progress.');
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Poker Remi Server] Listening on http://0.0.0.0:${PORT}`);
});
