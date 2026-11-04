import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/server/roomManager.js';

describe('Server & WebSocket Integration', () => {
  let server: http.Server;
  let ioServer: Server;
  let roomManager: RoomManager;
  let port: number;
  let clientSocket: ClientSocketType;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    roomManager = new RoomManager(ioServer);

    app.use(express.json());
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
    app.get('/api/rooms', (req, res) => res.json(roomManager.listPublicRooms()));
    app.post('/api/rooms', (req, res) => {
      const room = roomManager.createRoom(req.body?.roomName, { fillWithBots: true, turnTimerSeconds: 15 });
      res.json({ roomId: room.id, roomName: room.name });
    });

    ioServer.on('connection', (socket) => {
      let currentRoomId: string | null = null;
      let currentPlayerId: string | null = null;

      socket.on('join_room', ({ roomId, playerName, avatar, playerId }) => {
        const code = (roomId || '').trim().toUpperCase();
        let room = roomManager.getRoom(code);
        if (!room) {
          room = roomManager.createRoom(`Meja ${code}`, { fillWithBots: true }, code);
        }
        const validPid = playerId || `p_${socket.id}`;
        currentPlayerId = validPid;
        (socket as any).playerId = validPid;
        socket.join(code);
        const player = room.addPlayer(validPid, playerName, avatar);
        socket.emit('joined_room', { playerId: currentPlayerId, player });
        room.broadcastState();
      });

      socket.on('start_game', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.startGame();
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3002;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket) clientSocket.disconnect();
    ioServer.close();
    server.close();
  });

  it('HTTP /api/health responds with ok', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('HTTP /api/rooms creates and lists rooms', async () => {
    const createRes = await fetch(`http://localhost:${port}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'Meja Test' })
    });
    const created = await createRes.json();
    expect(created.roomId).toBeDefined();
    expect(created.roomName).toBe('Meja Test');

    const listRes = await fetch(`http://localhost:${port}/api/rooms`);
    const list = await listRes.json();
    expect(list.some((r: any) => r.roomId === created.roomId)).toBe(true);
  });

  it('connects via Socket.IO, joins room, fills with bots, and starts game', async () => {
    clientSocket = ClientSocket(`http://localhost:${port}`, {
      transports: ['websocket']
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
    expect(clientSocket.connected).toBe(true);

    // Join room
    const testRoomCode = 'TEST';
    clientSocket.emit('join_room', {
      roomId: testRoomCode,
      playerName: 'Bambang',
      avatar: '🤠',
      playerId: 'test_player_1'
    });

    const joinedData: any = await new Promise((resolve) => {
      clientSocket.on('joined_room', resolve);
    });
    expect(joinedData.playerId).toBe('test_player_1');
    expect(joinedData.player.name).toBe('Bambang');

    // Start game
    clientSocket.emit('start_game', { roomId: testRoomCode });

    const playingState: any = await new Promise((resolve) => {
      clientSocket.on('game_state', (state: any) => {
        if (state.status === 'playing') {
          resolve(state);
        }
      });
    });

    expect(playingState.status).toBe('playing');
    expect(playingState.players).toHaveLength(4);

    // 1 human player + 3 bots
    const myPlayer = playingState.players.find((p: any) => p.id === 'test_player_1');
    expect(myPlayer).toBeDefined();
    expect(myPlayer.hand).toHaveLength(13);

    const botPlayers = playingState.players.filter((p: any) => p.isBot);
    expect(botPlayers).toHaveLength(3);

    // Starter must be identified and first turn set
    expect(playingState.currentTurnPlayerId).toBeDefined();
    expect(playingState.isFirstTurnOfGame).toBe(true);
  });
});
