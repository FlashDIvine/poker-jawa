import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { Room, RoomManager } from '../src/server/roomManager.js';

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
          room = roomManager.createRoom(`Meja ${code}`, { fillWithBots: true }, code);
        }
        const validPid = playerId || `p_${socket.id}`;
        currentRoomId = code;
        currentPlayerId = validPid;
        (socket as any).playerId = validPid;
        socket.join(code);
        const player = room.addPlayer(validPid, playerName, avatar);
        socket.emit('joined_room', { playerId: currentPlayerId, player });
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

  it('leave_room removes the player and cleans up empty room', async () => {
    const tempRoomCode = 'TEMP';
    clientSocket.emit('join_room', {
      roomId: tempRoomCode,
      playerName: 'Temporary',
      playerId: 'temp_p1'
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(roomManager.getRoom(tempRoomCode)).toBeDefined();

    // Leave room
    clientSocket.emit('leave_room', { roomId: tempRoomCode, playerId: 'temp_p1' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Room should have been cleaned up because 0 human players remain
    expect(roomManager.getRoom(tempRoomCode)).toBeUndefined();
  });

  it('replaces bot when human player joins a waiting room with existing bots', () => {
    const room = roomManager.createRoom('Bot Meja', { fillWithBots: true }, 'BOTS');
    room.addPlayer('host1', 'Host 1');
    room.startGame(); // fills with 3 bots (total 4)
    room.resetForNextGame(); // status is waiting, still 4 players (1 human + 3 bots)

    expect(room.state.status).toBe('waiting');
    expect(room.state.players).toHaveLength(4);
    expect(room.state.players.filter(p => p.isBot)).toHaveLength(3);

    // Human player 2 joins
    const human2 = room.addPlayer('human2', 'Player Two');
    expect(human2).not.toBeNull();
    expect(room.state.players.filter(p => !p.isBot)).toHaveLength(2);
    expect(room.state.players.filter(p => p.isBot)).toHaveLength(2);

    roomManager.deleteRoom('BOTS');
  });

  it('enforces that passed players are skipped and trick ends when all other players pass', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('PASS', 'Pass Test', mockIo, { fillWithBots: false });
    room.addPlayer('p0', 'Player 0');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.addPlayer('p3', 'Player 3');

    // Give manually crafted hands with multiple cards so players do not empty hand immediately
    room.state.status = 'playing';
    room.state.isFirstTurnOfGame = false;
    room.state.players[0].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'KS', rank: 13, suit: 'S', suitValue: 1, rankLabel: 'K', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[1].hand = [
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'AS', rank: 14, suit: 'S', suitValue: 1, rankLabel: 'As', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: true, isThreeSpades: false }
    ];
    room.state.players[2].hand = [
      { id: '8S', rank: 8, suit: 'S', suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[3].hand = [
      { id: '9S', rank: 9, suit: 'S', suitValue: 1, rankLabel: '9', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '2H', rank: 15, suit: 'H', suitValue: 4, rankLabel: '2', suitSymbol: '♥', suitName: 'Hati', color: 'red', isPoker: true, isAce: false, isThreeSpades: false }
    ];

    room.state.currentTurnPlayerId = 'p0';
    room.state.leadPlayerId = 'p0';
    room.state.lastPlay = null;

    // 1. P0 leads 4S
    const play1 = room.playCards('p0', ['4S']);
    expect(play1.success).toBe(true);
    expect(room.state.currentTurnPlayerId).toBe('p1');

    // 2. P1 passes (P1.passed = true)
    const pass1 = room.passTurn('p1');
    expect(pass1.success).toBe(true);
    expect(room.state.players[1].passed).toBe(true);
    expect(room.state.currentTurnPlayerId).toBe('p2');

    // 3. P2 plays 8S (kartu baru dikeluarkan -> status lewat di-reset agar giliran muter masih bisa jalan lagi)
    const play2 = room.playCards('p2', ['8S']);
    expect(play2.success).toBe(true);
    expect(room.state.players[1].passed).toBe(false); // P1 dapat bermain lagi jika giliran berputar kepadanya
    expect(room.state.leadPlayerId).toBe('p2');
    expect(room.state.currentTurnPlayerId).toBe('p3');

    // 4. P3 passes (P3.passed = true)
    const pass2 = room.passTurn('p3');
    expect(pass2.success).toBe(true);
    expect(room.state.players[3].passed).toBe(true);
    expect(room.state.currentTurnPlayerId).toBe('p0');

    // 5. P0 passes (P0.passed = true)
    const pass3 = room.passTurn('p0');
    expect(pass3.success).toBe(true);
    expect(room.state.players[0].passed).toBe(true);
    // Giliran berputar kembali ke P1 (karena muter masih bisa jalan lagi)
    expect(room.state.currentTurnPlayerId).toBe('p1');

    // 6. P1 passes (kini P3, P0, dan P1 berturut-turut lewat melawan 8S dari P2)
    const pass4 = room.passTurn('p1');
    expect(pass4.success).toBe(true);

    // Trick must end! P2 wins trick!
    expect(room.state.lastPlay).toBeNull(); // clean table
    expect(room.state.currentTurnPlayerId).toBe('p2'); // P2 leads new round
    expect(room.state.players.every(p => !p.passed)).toBe(true); // all passed flags reset
  });

  it('continues playing after a player finishes until only the last cardholder remains', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('MULTI_RANK', 'Multi Rank Room', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    room.addPlayer('p0', 'Player 0');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    expect(room.startGame()).toBe(true);

    // Setup custom hands:
    // P0: 1 card (3S)
    // P1: 2 cards (4S, 5S)
    // P2: 2 cards (6S, 7S)
    room.state.isFirstTurnOfGame = true;
    room.state.players[0].hand = [
      { id: '3S', rank: 3, suit: 'S', suitValue: 1, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: true }
    ];
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '9S', rank: 9, suit: 'S', suitValue: 1, rankLabel: '9', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[2].hand = [
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '10S', rank: 10, suit: 'S', suitValue: 1, rankLabel: '10', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.currentTurnPlayerId = 'p0';
    room.state.leadPlayerId = 'p0';

    // 1. P0 plays their only card 3S -> P0 has 0 cards!
    const play1 = room.playCards('p0', ['3S']);
    expect(play1.success).toBe(true);
    expect(room.state.players[0].hand).toHaveLength(0);
    expect(room.state.players[0].finishRank).toBe(1); // Juara 1
    // GAME MUST STILL BE PLAYING!
    expect(room.state.status).toBe('playing');
    // Turn advances to P1 (who still has cards)
    expect(room.state.currentTurnPlayerId).toBe('p1');

    // 2. P1 plays 4S -> P1 has 1 card left
    const play2 = room.playCards('p1', ['4S']);
    expect(play2.success).toBe(true);
    expect(room.state.status).toBe('playing');
    // Turn advances to P2
    expect(room.state.currentTurnPlayerId).toBe('p2');

    // 3. P2 plays 5S -> P2 has 1 card left
    const play3 = room.playCards('p2', ['5S']);
    expect(play3.success).toBe(true);
    expect(room.state.status).toBe('playing');
    // Turn should skip P0 (who has 0 cards) and go to P1!
    expect(room.state.currentTurnPlayerId).toBe('p1');

    // 4. P1 plays their last card 9S -> P1 finishes!
    const play4 = room.playCards('p1', ['9S']);
    expect(play4.success).toBe(true);
    expect(room.state.players[1].finishRank).toBe(2); // Juara 2

    // Now only P2 has cards (pemegang kartu terakhir)!
    // Game should automatically complete and transition to game_over!
    expect(room.state.status).toBe('game_over');
    expect(room.state.players[2].finishRank).toBe(3); // Pemegang kartu terakhir (Rank 3)
    expect(room.state.results).toHaveLength(3);
    expect(room.state.results?.[0].playerId).toBe('p0');
    expect(room.state.results?.[0].rank).toBe(1);
    expect(room.state.results?.[1].playerId).toBe('p1');
    expect(room.state.results?.[1].rank).toBe(2);
    expect(room.state.results?.[2].playerId).toBe('p2');
    expect(room.state.results?.[2].rank).toBe(3);
  });

  it('handles 2-player duel flow: 26 cards each, 1-pass trick win, and game completion', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('DUEL2P', '2 Player Duel Room', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    room.addPlayer('d1', 'Duelist 1');
    room.addPlayer('d2', 'Duelist 2');
    expect(room.startGame()).toBe(true);

    // Both players receive 26 cards each
    expect(room.state.players).toHaveLength(2);
    expect(room.state.players[0].hand).toHaveLength(26);
    expect(room.state.players[1].hand).toHaveLength(26);

    // Determine starter (the one holding 3S)
    const starterId = room.state.currentTurnPlayerId!;
    const otherId = starterId === 'd1' ? 'd2' : 'd1';

    // Override hands to test predictable 2-player trick & pass flow
    const starter = room.getPlayer(starterId)!;
    const opponent = room.getPlayer(otherId)!;

    starter.hand = [
      { id: '3S', rank: 3, suit: 'S', suitValue: 1, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: true },
      { id: '10S', rank: 10, suit: 'S', suitValue: 1, rankLabel: '10', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    starter.cardCount = 2;

    opponent.hand = [
      { id: '7H', rank: 7, suit: 'H', suitValue: 4, rankLabel: '7', suitSymbol: '♥', suitName: 'Hati', color: 'red', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '9H', rank: 9, suit: 'H', suitValue: 4, rankLabel: '9', suitSymbol: '♥', suitName: 'Hati', color: 'red', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    opponent.cardCount = 2;

    // 1. Starter plays 3S
    const play1 = room.playCards(starterId, ['3S']);
    expect(play1.success).toBe(true);
    expect(room.state.currentTurnPlayerId).toBe(otherId);

    // 2. In 2-player game, opponent passes -> required passes is 2 - 1 = 1
    const passRes = room.passTurn(otherId);
    expect(passRes.success).toBe(true);

    // 1 pass ends the trick immediately in 2-player mode!
    expect(room.state.lastPlay).toBeNull();
    expect(room.state.currentTurnPlayerId).toBe(starterId);
    expect(room.state.leadPlayerId).toBe(starterId);

    // 3. Starter plays their remaining card 10S -> Starter finishes (0 cards)
    const play2 = room.playCards(starterId, ['10S']);
    expect(play2.success).toBe(true);

    // Game ends immediately!
    expect(room.state.status).toBe('game_over');
    expect(room.state.winnerId).toBe(starterId);
    expect(room.state.results).toHaveLength(2);
    expect(room.state.results?.[0].playerId).toBe(starterId);
    expect(room.state.results?.[0].rank).toBe(1);
    expect(room.state.results?.[0].isWinner).toBe(true);
    expect(room.state.results?.[1].playerId).toBe(otherId);
    expect(room.state.results?.[1].rank).toBe(2);
    expect(room.state.results?.[1].isWinner).toBe(false);
  });

  it('normalizes string deckCount and deals 2 decks (104 cards) for 4 players when deckCount is "2"', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('2DECK', '2 Deck Room', mockIo, {
      fillWithBots: true,
      maxPlayers: 4,
      rules: { deckCount: '2' as any }
    });

    expect(room.rules.deckCount).toBe(2);
    expect(room.startGame()).toBe(true);
    expect(room.state.players).toHaveLength(4);
    // 104 cards divided by 4 players = 26 cards each
    expect(room.state.players[0].hand).toHaveLength(26);
    expect(room.state.players[1].hand).toHaveLength(26);
  });
});
