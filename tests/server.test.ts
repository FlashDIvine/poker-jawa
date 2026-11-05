import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { Room, RoomManager } from '../src/server/roomManager.js';
import { DEFAULT_RULES } from '../src/shared/types.js';

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

      socket.on('resume_control', (payload) => {
        const { roomId, playerId } = payload || {};
        const code = (roomId || currentRoomId || '').toUpperCase();
        const room = roomManager.getRoom(code);
        if (!room) return;

        const pid = playerId || currentPlayerId;
        if (!pid) return;

        const resumed = room.resumeControl(pid);
        if (resumed) {
          socket.emit('control_resumed', { playerId: pid });
        }
      });

      socket.on('send_chat', ({ roomId, playerId, text }) => {
        const code = (roomId || currentRoomId || '').toUpperCase();
        const room = roomManager.getRoom(code);
        if (!room) return;

        const pid = playerId || currentPlayerId;
        if (!pid || !text) return;

        room.resumeControl(pid);
        room.addChatMessage(pid, text);
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

    // 1 human player + 3 bots (52 cards dealt minus 4 rank 3 cards discarded = 48 cards total)
    const myPlayer = playingState.players.find((p: any) => p.id === 'test_player_1');
    expect(myPlayer).toBeDefined();
    expect(myPlayer.hand.some((c: any) => c.rank === 3)).toBe(false);
    const totalCards = playingState.players.reduce((sum: number, p: any) => sum + p.cardCount, 0);
    expect(totalCards).toBe(48);

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

    // 52 cards divided between 2 players (26 each), minus all four 3s discarded (total 48 cards)
    expect(room.state.players).toHaveLength(2);
    expect(room.state.players[0].hand.length + room.state.players[1].hand.length).toBe(48);
    expect(room.state.players.every(p => !p.hand.some(c => c.rank === 3))).toBe(true);

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

  it('strictly deals 1 deck (52 cards max) even if deckCount was set to 2 or for 6-10 players', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('1DECK_LIMIT', 'Strict 1 Deck Room', mockIo, {
      fillWithBots: true,
      maxPlayers: 4,
      rules: { deckCount: '2' as any }
    });

    expect(room.rules.deckCount).toBe(1);
    expect(room.startGame()).toBe(true);
    expect(room.state.players).toHaveLength(4);
    // 52 cards divided by 4 players = 13 cards each initially, minus all four rank 3 cards discarded
    const totalRemaining = room.state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalRemaining).toBe(48); // 52 - 4 (all 3s discarded)
    expect(room.state.players.every(p => !p.hand.some(c => c.rank === 3))).toBe(true);
  });

  it('opening discard of all 3s and 3♠ holder gets first turn without needing to hold a 3', () => {
    const chatMessages: string[] = [];
    const mockIo = {
      to: () => ({
        emit: (event: string, data: any) => {
          if (event === 'chat_message' && data.isSystem) {
            chatMessages.push(data.text);
          }
        }
      }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('OPEN_3', 'Opening 3s Room', mockIo, { fillWithBots: false });
    room.addPlayer('p0', 'Player 0');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.addPlayer('p3', 'Player 3');

    expect(room.startGame()).toBe(true);

    // Verify nobody holds any 3
    for (const player of room.state.players) {
      expect(player.hand.some(c => c.rank === 3)).toBe(false);
      expect(player.cardCount).toBe(player.hand.length);
    }

    const starterId = room.state.currentTurnPlayerId!;
    expect(starterId).toBeDefined();
    const starter = room.getPlayer(starterId)!;
    expect(starter).toBeDefined();

    // The starter player can play their first legal combo without a 3 (e.g. single 4 or lowest card)
    const lowestCard = [...starter.hand].sort((a, b) => a.rank - b.rank)[0];
    const playResult = room.playCards(starterId, [lowestCard.id]);
    expect(playResult.success).toBe(true);

    // Verify chat cleanup: "mengeluarkan", "memilih Lewat", and "Semua pemain lain lewat" are NOT in system chat!
    expect(chatMessages.some(m => m.includes('mengeluarkan:'))).toBe(false);
    expect(chatMessages.some(m => m.includes('memilih Lewat'))).toBe(false);
    expect(chatMessages.some(m => m.includes('Semua pemain lain lewat'))).toBe(false);
  });

  it('ranks dead last and flags booing when a player holds a poker card (rank 2) at game end', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('BOO1', 'Booing Test Room', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    room.addPlayer('p0', 'Winner P0');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Poker Holder P2');
    expect(room.startGame()).toBe(true);

    // P0: 1 card (3S)
    // P1: 3 cards (4S, 5S, 6S - no poker)
    // P2: 1 card (2S - poker card!)
    room.state.isFirstTurnOfGame = true;
    room.state.players[0].hand = [
      { id: '3S', rank: 3, suit: 'S', suitValue: 1, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: true }
    ];
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '6S', rank: 6, suit: 'S', suitValue: 1, rankLabel: '6', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[2].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.currentTurnPlayerId = 'p0';
    room.state.leadPlayerId = 'p0';

    // P0 plays 3S -> finishes!
    const play1 = room.playCards('p0', ['3S']);
    expect(play1.success).toBe(true);
    expect(room.state.players[0].finishRank).toBe(1);

    // Turn is at P1, P1 plays 4S -> now P1 has 2 cards
    const play2 = room.playCards('p1', ['4S']);
    expect(play2.success).toBe(true);

    // Turn is at P2, P2 plays 2S -> P2 has 0 cards -> finishes 2nd
    // But let's test when P2 does NOT play 2S and P1 clears, OR game ends:
    // P2 passes
    const pass1 = room.passTurn('p2');
    expect(pass1.success).toBe(true);

    // Turn back to P1, P1 plays 5S
    const play3 = room.playCards('p1', ['5S']);
    expect(play3.success).toBe(true);

    // P2 passes
    const pass2 = room.passTurn('p2');
    expect(pass2.success).toBe(true);

    // P1 plays last card 6S -> P1 finishes 2nd!
    const play4 = room.playCards('p1', ['6S']);
    expect(play4.success).toBe(true);
    expect(room.state.players[1].finishRank).toBe(2);

    // Game is over!
    expect(room.state.status).toBe('game_over');
    expect(room.state.hasPokerBooing).toBe(true);
    expect(room.state.pokerLoserNames).toEqual(['Poker Holder P2']);

    // P2 held 2S (poker card): must rank dead last (rank 3)!
    expect(room.state.players[2].finishRank).toBe(3);

    const p2Result = room.state.results?.find(r => r.playerId === 'p2');
    expect(p2Result).toBeDefined();
    expect(p2Result?.rank).toBe(3);
    expect(p2Result?.caughtHoldingPoker).toBe(true);
    expect(p2Result?.pokerCardsCount).toBe(1);
    // Double penalty for holding poker: 1 card * 2^1 = 2 -> scoreDelta = -2
    expect(p2Result?.scoreDelta).toBe(-2);
  });

  it('ranks poker card holders dead last behind non-poker players even if non-poker players have more cards', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('BOO2', 'Multi Player Booing Room', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    room.addPlayer('p0', 'Player 0');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.addPlayer('p3', 'Player 3');
    expect(room.startGame()).toBe(true);

    // P0 has finished earlier (0 cards)
    room.state.players[0].hand = [];
    room.state.players[0].cardCount = 0;
    room.state.players[0].finishRank = 1;
    (room as any).finishers = ['p0'];

    // P1 has 5 cards, none is poker
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '6S', rank: 6, suit: 'S', suitValue: 1, rankLabel: '6', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '7S', rank: 7, suit: 'S', suitValue: 1, rankLabel: '7', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '8S', rank: 8, suit: 'S', suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    // P2 has 1 card: 2S (poker card)
    room.state.players[2].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    // P3 has 2 cards: 2H and 2D (two poker cards!)
    room.state.players[3].hand = [
      { id: '2H', rank: 15, suit: 'H', suitValue: 4, rankLabel: '2', suitSymbol: '♥', suitName: 'Hati', color: 'red', isPoker: true, isAce: false, isThreeSpades: false },
      { id: '2D', rank: 15, suit: 'D', suitValue: 3, rankLabel: '2', suitSymbol: '♦', suitName: 'Wajik', color: 'red', isPoker: true, isAce: false, isThreeSpades: false }
    ];

    // Trigger game over directly
    (room as any).handleGameOver();

    expect(room.state.status).toBe('game_over');
    expect(room.state.hasPokerBooing).toBe(true);
    expect(room.state.pokerLoserNames).toEqual(['Player 2', 'Player 3']);

    // P0: Rank 1
    // P1: Rank 2 (even with 5 cards, because P1 has NO poker cards!)
    // P2: Rank 3 (dead last group, 1 card)
    // P3: Rank 4 (dead last group, 2 poker cards)
    expect(room.state.players[0].finishRank).toBe(1);
    expect(room.state.players[1].finishRank).toBe(2);
    expect(room.state.players[2].finishRank).toBe(3);
    expect(room.state.players[3].finishRank).toBe(4);

    const r1 = room.state.results?.find(r => r.playerId === 'p1');
    const r2 = room.state.results?.find(r => r.playerId === 'p2');
    const r3 = room.state.results?.find(r => r.playerId === 'p3');

    expect(r1?.caughtHoldingPoker).toBe(false);
    expect(r1?.scoreDelta).toBe(-5); // Hand has 5 cards and did not finish -> -5
    expect(r2?.caughtHoldingPoker).toBe(true);
    expect(r2?.scoreDelta).toBe(-2);
    expect(r3?.caughtHoldingPoker).toBe(true);
    expect(r3?.pokerCardsCount).toBe(2);
    // P3 penalty: 2 cards * 2^2 = 8 -> scoreDelta = -8
    expect(r3?.scoreDelta).toBe(-8);
  });

  it('ranks player with MORE poker cards behind player with FEWER poker cards even if having fewer total cards', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('POKER_COUNT_SORT', 'Poker Count Sort', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    room.addPlayer('p0', 'Winner 0');
    room.addPlayer('p1', 'Player 1 (1 Poker, 3 total cards)');
    room.addPlayer('p2', 'Player 2 (2 Pokers, 2 total cards)');
    expect(room.startGame()).toBe(true);

    // P0: 0 cards (finished)
    room.state.players[0].hand = [];
    room.state.players[0].cardCount = 0;
    room.state.players[0].finishRank = 1;
    (room as any).finishers = ['p0'];

    // P1: 3 cards, 1 poker card (2S)
    room.state.players[1].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false },
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];

    // P2: 2 cards, BOTH are poker cards (2H, 2D)
    room.state.players[2].hand = [
      { id: '2H', rank: 15, suit: 'H', suitValue: 4, rankLabel: '2', suitSymbol: '♥', suitName: 'Hati', color: 'red', isPoker: true, isAce: false, isThreeSpades: false },
      { id: '2D', rank: 15, suit: 'D', suitValue: 3, rankLabel: '2', suitSymbol: '♦', suitName: 'Wajik', color: 'red', isPoker: true, isAce: false, isThreeSpades: false }
    ];

    (room as any).handleGameOver();

    expect(room.state.status).toBe('game_over');
    expect(room.state.hasPokerBooing).toBe(true);

    // P1 held 1 poker card -> Rank 2
    // P2 held 2 poker cards -> Rank 3 (dead last, because holding more poker cards is more severely penalized!)
    expect(room.state.players[0].finishRank).toBe(1);
    expect(room.state.players[1].finishRank).toBe(2);
    expect(room.state.players[2].finishRank).toBe(3);

    const r1 = room.state.results?.find(r => r.playerId === 'p1');
    const r2 = room.state.results?.find(r => r.playerId === 'p2');
    expect(r1?.rank).toBe(2);
    expect(r2?.rank).toBe(3);
    expect(r1?.scoreDelta).toBe(-6); // 3 cards * 2^1 = 6 -> -6
    expect(r2?.scoreDelta).toBe(-8); // 2 cards * 2^2 = 8 -> -8
  });

  it('handles game over when ALL remaining players hold poker cards', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('ALL_BOO', 'All Boo Room', mockIo, { fillWithBots: false });
    room.addPlayer('p0', 'Winner');
    room.addPlayer('p1', 'Loser 1');
    room.addPlayer('p2', 'Loser 2');
    room.addPlayer('p3', 'Loser 3');
    expect(room.startGame()).toBe(true);

    room.state.players[0].hand = [];
    room.state.players[0].finishRank = 1;
    (room as any).finishers = ['p0'];

    // All three remaining hold poker cards
    room.state.players[1].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[2].hand = [
      { id: '2C', rank: 15, suit: 'C', suitValue: 2, rankLabel: '2', suitSymbol: '♣', suitName: 'Keriting', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[3].hand = [
      { id: '2H', rank: 15, suit: 'H', suitValue: 4, rankLabel: '2', suitSymbol: '♥', suitName: 'Hati', color: 'red', isPoker: true, isAce: false, isThreeSpades: false }
    ];

    (room as any).handleGameOver();

    expect(room.state.status).toBe('game_over');
    expect(room.state.hasPokerBooing).toBe(true);
    expect(room.state.pokerLoserNames).toEqual(['Loser 1', 'Loser 2', 'Loser 3']);
    expect(room.state.results?.every(r => r.rank === 1 || r.caughtHoldingPoker)).toBe(true);
  });

  it('handles 2-player duel when the loser is caught holding a poker card vs no poker card', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    // Sub-case A: Duel loser holds a poker card (2S)
    const roomA = new Room('DUEL_BOO', 'Duel Booing', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    roomA.addPlayer('d1', 'Duelist 1');
    roomA.addPlayer('d2', 'Duelist 2');
    expect(roomA.startGame()).toBe(true);

    roomA.state.isFirstTurnOfGame = true;
    roomA.state.players[0].hand = [
      { id: '3S', rank: 3, suit: 'S', suitValue: 1, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: true }
    ];
    roomA.state.players[1].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false },
      { id: '9S', rank: 9, suit: 'S', suitValue: 1, rankLabel: '9', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    roomA.state.currentTurnPlayerId = 'd1';

    // D1 plays 3S -> finishes! Game ends immediately.
    const playA = roomA.playCards('d1', ['3S']);
    expect(playA.success).toBe(true);
    expect(roomA.state.status).toBe('game_over');
    expect(roomA.state.hasPokerBooing).toBe(true);
    expect(roomA.state.pokerLoserNames).toEqual(['Duelist 2']);
    expect(roomA.state.players[1].finishRank).toBe(2);
    const d2Result = roomA.state.results?.find(r => r.playerId === 'd2');
    expect(d2Result?.caughtHoldingPoker).toBe(true);
    // 2 cards * 2^1 = 4 -> -4
    expect(d2Result?.scoreDelta).toBe(-4);

    // Sub-case B: Duel loser does NOT hold any poker card
    const roomB = new Room('DUEL_NO_BOO', 'Duel Clean', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    roomB.addPlayer('d1', 'Duelist 1');
    roomB.addPlayer('d2', 'Duelist 2');
    expect(roomB.startGame()).toBe(true);

    roomB.state.isFirstTurnOfGame = true;
    roomB.state.players[0].hand = [
      { id: '3S', rank: 3, suit: 'S', suitValue: 1, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: true }
    ];
    roomB.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    roomB.state.currentTurnPlayerId = 'd1';

    const playB = roomB.playCards('d1', ['3S']);
    expect(playB.success).toBe(true);
    expect(roomB.state.status).toBe('game_over');
    expect(roomB.state.hasPokerBooing).toBe(false);
    expect(roomB.state.pokerLoserNames).toEqual([]);
    const cleanResult = roomB.state.results?.find(r => r.playerId === 'd2');
    expect(cleanResult?.caughtHoldingPoker).toBe(false);
    expect(cleanResult?.scoreDelta).toBe(-1);
  });

  it('declares a player who finishes with card 2 (poker) as the loser and declares the opponent the winner in a duel', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('POKER_LAST_DUEL', 'Poker Last Duel', mockIo, { fillWithBots: false });
    room.addPlayer('d1', 'Duelist 1');
    room.addPlayer('d2', 'Duelist 2');
    expect(room.startGame()).toBe(true);

    room.state.isFirstTurnOfGame = false;
    room.state.lastPlay = null;
    // D1 has only 1 card: 2S (poker)
    room.state.players[0].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[0].cardCount = 1;

    // D2 has 5 cards
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '6S', rank: 6, suit: 'S', suitValue: 1, rankLabel: '6', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '7S', rank: 7, suit: 'S', suitValue: 1, rankLabel: '7', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '8S', rank: 8, suit: 'S', suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[1].cardCount = 5;

    room.state.currentTurnPlayerId = 'd1';

    // D1 attempts to finish with 2S!
    const play = room.playCards('d1', ['2S']);
    expect(play.success).toBe(true);

    // Game ends immediately! D1 is declared LOSER (Rank 2), D2 is declared WINNER (Rank 1)!
    expect(room.state.status).toBe('game_over');
    expect(room.state.winnerId).toBe('d2');
    expect(room.state.hasPokerBooing).toBe(true);
    expect(room.state.pokerLoserNames).toEqual(['Duelist 1']);

    const d1Result = room.state.results?.find(r => r.playerId === 'd1');
    const d2Result = room.state.results?.find(r => r.playerId === 'd2');

    expect(d1Result?.rank).toBe(2);
    expect(d1Result?.isWinner).toBe(false);
    expect(d1Result?.caughtHoldingPoker).toBe(true);
    expect(d1Result?.scoreDelta).toBeLessThan(0);

    expect(d2Result?.rank).toBe(1);
    expect(d2Result?.isWinner).toBe(true);
    expect(d2Result?.scoreDelta).toBe(30);
  });

  it('declares a player who finishes with card 2 (poker) as dead last loser and all other players win in a 4-player game', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('POKER_LAST_4P', 'Poker Last 4P', mockIo, { fillWithBots: false });
    room.addPlayer('p0', 'Player 0');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.addPlayer('p3', 'Player 3');
    expect(room.startGame()).toBe(true);

    room.state.isFirstTurnOfGame = false;
    room.state.lastPlay = null;

    // P0 has 1 card: 2S (poker)
    room.state.players[0].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[0].cardCount = 1;

    // P1 has 2 cards
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[1].cardCount = 2;

    // P2 has 3 cards
    room.state.players[2].hand = [
      { id: '6S', rank: 6, suit: 'S', suitValue: 1, rankLabel: '6', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '7S', rank: 7, suit: 'S', suitValue: 1, rankLabel: '7', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '8S', rank: 8, suit: 'S', suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[2].cardCount = 3;

    // P3 has 4 cards
    room.state.players[3].hand = [
      { id: '9S', rank: 9, suit: 'S', suitValue: 1, rankLabel: '9', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '10S', rank: 10, suit: 'S', suitValue: 1, rankLabel: '10', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'JS', rank: 11, suit: 'S', suitValue: 1, rankLabel: 'J', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'QS', rank: 12, suit: 'S', suitValue: 1, rankLabel: 'Q', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[3].cardCount = 4;

    room.state.currentTurnPlayerId = 'p0';

    // P0 plays 2S as last card!
    const play = room.playCards('p0', ['2S']);
    expect(play.success).toBe(true);

    // P0 is dead last (Rank 4), P1 is Winner (Rank 1), P2 is Rank 2, P3 is Rank 3!
    expect(room.state.status).toBe('game_over');
    expect(room.state.hasPokerBooing).toBe(true);
    expect(room.state.pokerLoserNames).toEqual(['Player 0']);

    const r0 = room.state.results?.find(r => r.playerId === 'p0');
    const r1 = room.state.results?.find(r => r.playerId === 'p1');
    const r2 = room.state.results?.find(r => r.playerId === 'p2');
    const r3 = room.state.results?.find(r => r.playerId === 'p3');

    expect(r0?.rank).toBe(4);
    expect(r0?.isWinner).toBe(false);
    expect(r0?.caughtHoldingPoker).toBe(true);

    expect(r1?.rank).toBe(1);
    expect(r1?.isWinner).toBe(true);
    expect(r1?.scoreDelta).toBe(30);

    expect(r2?.rank).toBe(2);
    expect(r2?.scoreDelta).toBe(10); // Rank 2 with 4 players gets +10 points

    expect(r3?.rank).toBe(3);
    expect(r3?.scoreDelta).toBe(0); // Winners do not get negative penalty on instant poker loss
  });

  it('declares a player who plays a non-poker card leaving ONLY card 2 in hand as the instant loser', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('POKER_REMAINING_DUEL', 'Poker Remaining Duel', mockIo, { fillWithBots: false });
    room.addPlayer('d1', 'Duelist 1');
    room.addPlayer('d2', 'Duelist 2');
    expect(room.startGame()).toBe(true);

    room.state.isFirstTurnOfGame = false;
    room.state.lastPlay = null;

    // D1 has 2 cards: 4S and 2S
    room.state.players[0].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[0].cardCount = 2;

    // D2 has 3 cards
    room.state.players[1].hand = [
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '6S', rank: 6, suit: 'S', suitValue: 1, rankLabel: '6', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '7S', rank: 7, suit: 'S', suitValue: 1, rankLabel: '7', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];
    room.state.players[1].cardCount = 3;

    room.state.currentTurnPlayerId = 'd1';

    // D1 plays 4S -> D1's remaining hand is now [2S]!
    const play1 = room.playCards('d1', ['4S']);
    expect(play1.success).toBe(true);

    // D2 passes
    const pass = room.passTurn('d2');
    expect(pass.success).toBe(true);

    // D1 plays their last card 2S!
    const play2 = room.playCards('d1', ['2S']);
    expect(play2.success).toBe(true);

    // D1 is immediately declared loser because D1 finished with card 2 (poker)!
    expect(room.state.status).toBe('game_over');
    expect(room.state.winnerId).toBe('d2');
    expect(room.state.hasPokerBooing).toBe(true);
    expect(room.state.pokerLoserNames).toEqual(['Duelist 1']);

    const d1Result = room.state.results?.find(r => r.playerId === 'd1');
    const d2Result = room.state.results?.find(r => r.playerId === 'd2');

    expect(d1Result?.rank).toBe(2);
    expect(d1Result?.isWinner).toBe(false);
    expect(d1Result?.caughtHoldingPoker).toBe(true);

    expect(d2Result?.rank).toBe(1);
    expect(d2Result?.isWinner).toBe(true);
    expect(d2Result?.scoreDelta).toBe(30);
  });

  it('does NOT penalize or boo other players who hold poker cards when another player triggers instant poker loss', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('POKER_FAIR_4P', 'Poker Fair 4P', mockIo, { fillWithBots: false });
    room.addPlayer('p0', 'Player 0 (Offender)');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2 (Has 2C in 4 cards)');
    room.addPlayer('p3', 'Player 3');
    expect(room.startGame()).toBe(true);

    room.state.isFirstTurnOfGame = false;
    room.state.lastPlay = null;

    // P0 has 1 card: 2S (poker)
    room.state.players[0].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];

    // P1 has 2 cards (non-poker)
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '5S', rank: 5, suit: 'S', suitValue: 1, rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];

    // P2 has 4 cards, one of which is 2C (not last card, just playing normally)
    room.state.players[2].hand = [
      { id: '6S', rank: 6, suit: 'S', suitValue: 1, rankLabel: '6', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '7S', rank: 7, suit: 'S', suitValue: 1, rankLabel: '7', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '8S', rank: 8, suit: 'S', suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '2C', rank: 15, suit: 'C', suitValue: 2, rankLabel: '2', suitSymbol: '♣', suitName: 'Keriting', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];

    // P3 has 5 cards (non-poker)
    room.state.players[3].hand = [
      { id: '9S', rank: 9, suit: 'S', suitValue: 1, rankLabel: '9', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: '10S', rank: 10, suit: 'S', suitValue: 1, rankLabel: '10', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'JS', rank: 11, suit: 'S', suitValue: 1, rankLabel: 'J', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'QS', rank: 12, suit: 'S', suitValue: 1, rankLabel: 'Q', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
      { id: 'KS', rank: 13, suit: 'S', suitValue: 1, rankLabel: 'K', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];

    room.state.currentTurnPlayerId = 'p0';
    room.playCards('p0', ['2S']);

    expect(room.state.status).toBe('game_over');
    // ONLY P0 is booed!
    expect(room.state.pokerLoserNames).toEqual(['Player 0 (Offender)']);

    const r0 = room.state.results?.find(r => r.playerId === 'p0');
    const r1 = room.state.results?.find(r => r.playerId === 'p1');
    const r2 = room.state.results?.find(r => r.playerId === 'p2');
    const r3 = room.state.results?.find(r => r.playerId === 'p3');

    // P0: offender, rank 4, caughtHoldingPoker true, penalty negative
    expect(r0?.rank).toBe(4);
    expect(r0?.caughtHoldingPoker).toBe(true);
    expect(r0?.scoreDelta).toBeLessThan(0);

    // P1: Rank 1 (2 cards) -> +30
    expect(r1?.rank).toBe(1);
    expect(r1?.scoreDelta).toBe(30);

    // P2: Rank 2 (4 cards) -> +10, NOT caughtHoldingPoker, NOT penalized!
    expect(r2?.rank).toBe(2);
    expect(r2?.caughtHoldingPoker).toBe(false);
    expect(r2?.scoreDelta).toBe(10);

    // P3: Rank 3 (5 cards) -> 0 pts, NOT penalized!
    expect(r3?.rank).toBe(3);
    expect(r3?.caughtHoldingPoker).toBe(false);
    expect(r3?.scoreDelta).toBe(0);
  });

  it('allows finishing with card 2 when holdingPokerAsLastCardLoses is explicitly disabled', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('POKER_ALLOWED', 'Poker Allowed Room', mockIo, {
      fillWithBots: false,
      rules: { ...DEFAULT_RULES, holdingPokerAsLastCardLoses: false }
    });
    room.addPlayer('p0', 'Player 0');
    room.addPlayer('p1', 'Player 1');
    expect(room.startGame()).toBe(true);

    room.state.isFirstTurnOfGame = false;
    room.state.lastPlay = null;

    room.state.players[0].hand = [
      { id: '2S', rank: 15, suit: 'S', suitValue: 1, rankLabel: '2', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: true, isAce: false, isThreeSpades: false }
    ];
    room.state.players[1].hand = [
      { id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }
    ];

    room.state.currentTurnPlayerId = 'p0';
    const play = room.playCards('p0', ['2S']);
    expect(play.success).toBe(true);

    // P0 successfully finishes as Rank 1 Winner!
    expect(room.state.players[0].finishRank).toBe(1);
    expect(room.state.status).toBe('game_over');
    expect(room.state.winnerId).toBe('p0');
  });

  it('guarantees 3♠ holder starts and all 3s are discarded even when client passes { rules: DEFAULT_RULES }', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('DISCARD_OPTS', 'Options Discard Test', mockIo, {
      fillWithBots: false,
      rules: { ...DEFAULT_RULES }
    });

    room.addPlayer('u1', 'User 1');
    room.addPlayer('u2', 'User 2');
    expect(room.rules.discardThrees).toBe(true);
    expect(room.startGame()).toBe(true);

    // Total 48 cards remaining (52 - 4 = 48)
    const remaining = room.state.players.reduce((sum, p) => sum + p.cardCount, 0);
    expect(remaining).toBe(48);
    expect(room.state.players.every(p => !p.hand.some(c => c.rank === 3))).toBe(true);

    // Starter should be able to lead with any legal combo from remaining hand
    const starterId = room.state.currentTurnPlayerId!;
    const starter = room.getPlayer(starterId)!;
    const playResult = room.playCards(starterId, [starter.hand[0].id]);
    expect(playResult.success).toBe(true);
  });

  it('supports no-hint mode option at room creation', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('NO_HINT', 'No Hint Room', mockIo, {
      fillWithBots: false,
      rules: { ...DEFAULT_RULES, allowHints: false }
    });

    expect(room.rules.allowHints).toBe(false);
    expect(room.state.rules.allowHints).toBe(false);
  });

  describe('AFK Takeover and Resume Control', () => {
    it('resumeControl() clears isAutoPlay, reconnects player, and cancels botTimeout on current turn', () => {
      let broadcastCount = 0;
      let systemMessages: string[] = [];
      const mockIo = {
        to: () => ({
          emit: (_event: string, msg: any) => {
            if (_event === 'chat_message' && msg?.isSystem) {
              systemMessages.push(msg.text);
            }
          }
        }),
        sockets: {
          adapter: { rooms: new Map([['AFK_ROOM', new Set(['sock_1'])]]) },
          sockets: new Map([['sock_1', { emit: () => { broadcastCount++; }, playerId: 'p1' }]])
        }
      } as any;

      const room = new Room('AFK_ROOM', 'AFK Test Room', mockIo, {
        fillWithBots: false,
        turnTimerSeconds: 15
      });

      const p1 = room.addPlayer('p1', 'Player 1')!;
      const p2 = room.addPlayer('p2', 'Player 2')!;
      expect(room.startGame()).toBe(true);

      // Simulate player 1 getting detected as AFK (handleTurnTimeout or manual flag)
      p1.isAutoPlay = true;
      p1.connected = false;
      room.state.currentTurnPlayerId = 'p1';

      // Schedule a simulated botTimeout
      let botTimerRan = false;
      (room as any).botTimeout = setTimeout(() => {
        botTimerRan = true;
      }, 5000);

      // Room timer was running down
      room.state.turnTimeRemaining = 3;

      // Player clicks / resumes control
      const resumed = room.resumeControl('p1');
      expect(resumed).toBe(true);
      expect(p1.isAutoPlay).toBe(false);
      expect(p1.connected).toBe(true);
      expect((room as any).botTimeout).toBeNull();
      expect(botTimerRan).toBe(false);
      expect(room.state.turnTimeRemaining).toBe(15);
      expect(broadcastCount).toBeGreaterThan(0);
      expect(systemMessages.some(m => m.includes('Player 1') && m.includes('(ON)'))).toBe(true);

      room.cleanup();
    });

    it('resumeControl() clears isAutoPlay even when it is NOT the player turn', () => {
      let broadcastCount = 0;
      const mockIo = {
        to: () => ({ emit: () => {} }),
        sockets: {
          adapter: { rooms: new Map([['AFK_NOT_TURN', new Set(['sock_2'])]]) },
          sockets: new Map([['sock_2', { emit: () => { broadcastCount++; }, playerId: 'p2' }]])
        }
      } as any;

      const room = new Room('AFK_NOT_TURN', 'AFK Not Turn Room', mockIo, {
        fillWithBots: false,
        turnTimerSeconds: 15
      });

      const p1 = room.addPlayer('p1', 'Player 1')!;
      const p2 = room.addPlayer('p2', 'Player 2')!;
      expect(room.startGame()).toBe(true);

      // p2 is marked AFK, but it is p1's turn
      p2.isAutoPlay = true;
      room.state.currentTurnPlayerId = 'p1';

      const resumed = room.resumeControl('p2');
      expect(resumed).toBe(true);
      expect(p2.isAutoPlay).toBe(false);
      expect(broadcastCount).toBeGreaterThan(0);

      // Subsequent resumeControl when already false is idempotent
      const resumedAgain = room.resumeControl('p2');
      expect(resumedAgain).toBe(false);

      room.cleanup();
    });

    it('resumeControl() rejects bots and unknown player ids', () => {
      const mockIo = {
        to: () => ({ emit: () => {} }),
        sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
      } as any;

      const room = new Room('AFK_BOT_TEST', 'AFK Bot Test', mockIo, {
        fillWithBots: true,
        maxPlayers: 2
      });
      room.addPlayer('human1', 'Human 1');
      room.startGame();

      const bot = room.state.players.find(p => p.isBot)!;
      bot.isAutoPlay = true;
      expect(room.resumeControl(bot.id)).toBe(false);
      expect(room.resumeControl('non_existent')).toBe(false);

      room.cleanup();
    });

    it('resumes control via Socket.IO resume_control event and receives control_resumed', async () => {
      const socket = ClientSocket(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const roomId = 'AFK_SOCK';
      socket.emit('join_room', {
        roomId,
        playerName: 'AfkTester',
        avatar: '🤠',
        playerId: 'tester_afk_pid'
      });

      await new Promise<void>((resolve) => socket.on('joined_room', () => resolve()));
      socket.emit('start_game', { roomId });

      await new Promise<void>((resolve) => {
        socket.on('game_state', (s: any) => {
          if (s.status === 'playing') resolve();
        });
      });

      const room = roomManager.getRoom(roomId)!;
      const tester = room.getPlayer('tester_afk_pid')!;
      // Mark as AFK
      tester.isAutoPlay = true;
      room.broadcastState();

      // Wait for state reflecting AFK
      await new Promise<void>((resolve) => {
        const handler = (s: any) => {
          const self = s.players.find((p: any) => p.id === 'tester_afk_pid');
          if (self?.isAutoPlay) {
            socket.off('game_state', handler);
            resolve();
          }
        };
        socket.on('game_state', handler);
      });

      // Now emit resume_control over socket
      const controlResumedPromise = new Promise<void>((resolve) => {
        socket.on('control_resumed', () => resolve());
      });

      const stateUpdatedPromise = new Promise<void>((resolve) => {
        const handler = (s: any) => {
          const self = s.players.find((p: any) => p.id === 'tester_afk_pid');
          if (self && !self.isAutoPlay) {
            socket.off('game_state', handler);
            resolve();
          }
        };
        socket.on('game_state', handler);
      });

      socket.emit('resume_control', { roomId, playerId: 'tester_afk_pid' });

      await Promise.all([controlResumedPromise, stateUpdatedPromise]);

      expect(tester.isAutoPlay).toBe(false);
      socket.disconnect();
    });

    it('resumes control even if playCards fails validation', () => {
      let broadcastCount = 0;
      const mockIo = {
        to: () => ({ emit: () => {} }),
        sockets: {
          adapter: { rooms: new Map([['AFK_INVALID_PLAY', new Set(['sock_inv'])]]) },
          sockets: new Map([['sock_inv', { emit: () => { broadcastCount++; }, playerId: 'p1' }]])
        }
      } as any;

      const room = new Room('AFK_INVALID_PLAY', 'AFK Invalid Play Room', mockIo, {
        fillWithBots: false,
        turnTimerSeconds: 15
      });

      const p1 = room.addPlayer('p1', 'Player 1')!;
      const p2 = room.addPlayer('p2', 'Player 2')!;
      room.startGame();

      // Make it p1's turn and mark p1 as AFK
      room.state.currentTurnPlayerId = 'p1';
      p1.isAutoPlay = true;
      (room as any).botTimeout = setTimeout(() => {}, 5000);

      // p1 attempts to play an invalid card (not in hand)
      const res = room.playCards('p1', ['NON_EXISTENT_CARD']);
      expect(res.success).toBe(false);
      // But p1 should immediately be resumed to ON!
      expect(p1.isAutoPlay).toBe(false);
      expect((room as any).botTimeout).toBeNull();
      expect(room.state.turnTimeRemaining).toBe(15);
      expect(broadcastCount).toBeGreaterThan(0);

      room.cleanup();
    });

    it('resumes control even if passTurn is not allowed (free turn)', () => {
      let broadcastCount = 0;
      const mockIo = {
        to: () => ({ emit: () => {} }),
        sockets: {
          adapter: { rooms: new Map([['AFK_INVALID_PASS', new Set(['sock_pass'])]]) },
          sockets: new Map([['sock_pass', { emit: () => { broadcastCount++; }, playerId: 'p1' }]])
        }
      } as any;

      const room = new Room('AFK_INVALID_PASS', 'AFK Invalid Pass Room', mockIo, {
        fillWithBots: false,
        turnTimerSeconds: 15
      });

      const p1 = room.addPlayer('p1', 'Player 1')!;
      const p2 = room.addPlayer('p2', 'Player 2')!;
      room.startGame();

      // Make it p1's turn with free turn (lastPlay is null) and mark p1 as AFK
      room.state.currentTurnPlayerId = 'p1';
      room.state.lastPlay = null;
      p1.isAutoPlay = true;

      // Pass is not allowed on free turn
      const res = room.passTurn('p1');
      expect(res.success).toBe(false);
      // But p1 is resumed to manual ON!
      expect(p1.isAutoPlay).toBe(false);
      expect(broadcastCount).toBeGreaterThan(0);

      room.cleanup();
    });

    it('resumes control when an AFK player sends a chat message over socket', async () => {
      const socket = ClientSocket(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const roomId = 'AFK_CHAT_RM';
      socket.emit('join_room', {
        roomId,
        playerName: 'Chatter',
        avatar: '🐱',
        playerId: 'chatter_pid'
      });

      await new Promise<void>((resolve) => socket.on('joined_room', () => resolve()));
      socket.emit('start_game', { roomId });

      await new Promise<void>((resolve) => {
        socket.on('game_state', (s: any) => {
          if (s.status === 'playing') resolve();
        });
      });

      const room = roomManager.getRoom(roomId)!;
      const chatter = room.getPlayer('chatter_pid')!;
      chatter.isAutoPlay = true;
      room.broadcastState();

      // Send chat
      socket.emit('send_chat', { roomId, playerId: 'chatter_pid', text: 'Halo saya kembali!' });

      await new Promise<void>((resolve) => {
        const handler = (s: any) => {
          const self = s.players.find((p: any) => p.id === 'chatter_pid');
          if (self && !self.isAutoPlay) {
            socket.off('game_state', handler);
            resolve();
          }
        };
        socket.on('game_state', handler);
      });

      expect(chatter.isAutoPlay).toBe(false);
      socket.disconnect();
    });

    it('resumes control when an AFK player reconnects via addPlayer', () => {
      const mockIo = {
        to: () => ({ emit: () => {} }),
        sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
      } as any;

      const room = new Room('AFK_RECONNECT', 'AFK Reconnect Room', mockIo, {
        fillWithBots: false,
        turnTimerSeconds: 15
      });

      const p1 = room.addPlayer('p1', 'Player 1')!;
      room.addPlayer('p2', 'Player 2')!;
      room.startGame();

      p1.isAutoPlay = true;
      p1.connected = false;

      // Reconnect
      room.addPlayer('p1', 'Player 1');

      expect(p1.isAutoPlay).toBe(false);
      expect(p1.connected).toBe(true);

      room.cleanup();
    });

    it('schedules a longer thinking delay for bots on first turn when discardThrees is active', () => {
      const mockIo = {
        to: () => ({ emit: () => {} }),
        sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
      } as any;

      const room = new Room('BOT_FIRST_TURN_DELAY', 'Bot Delay Room', mockIo, {
        fillWithBots: true,
        turnTimerSeconds: 15
      });

      room.addPlayer('human1', 'Human Player');
      room.startGame();

      const bot = room.state.players.find(p => p.isBot)!;
      room.state.currentTurnPlayerId = bot.id;
      room.state.isFirstTurnOfGame = true;

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      room.triggerBotTurnIfNeeded();

      const calls = setTimeoutSpy.mock.calls;
      const botDelayCall = calls.find(call => typeof call[1] === 'number' && (call[1] as number) >= 5000);
      expect(botDelayCall).toBeDefined();
      expect((botDelayCall![1] as number)).toBeGreaterThanOrEqual(5200);

      setTimeoutSpy.mockRestore();
      room.cleanup();
    });
  });
});
