import { Server, Socket } from 'socket.io';
import { Card, GameResult, GameState, Player, PlayedTrick, ChatMessage, RoomListItem } from '../shared/types.js';
import { createDeck, shuffleDeck, dealDeck, findPlayerWithThreeSpades, sortCards } from '../shared/deck.js';
import { validatePlay } from '../shared/engine.js';
import { decideBotMove, BOT_NAMES, BOT_AVATARS } from '../shared/bot.js';

export interface RoomOptions {
  roomName?: string;
  fillWithBots?: boolean;
  turnTimerSeconds?: number;
}

export class Room {
  public id: string;
  public name: string;
  public fillWithBots: boolean;
  public turnTimerSeconds: number;
  public state: GameState;
  public chatMessages: ChatMessage[] = [];
  private io: Server;
  private turnInterval: NodeJS.Timeout | null = null;
  private botTimeout: NodeJS.Timeout | null = null;

  constructor(id: string, name: string, io: Server, options?: RoomOptions) {
    this.id = id;
    this.name = name || `Meja #${id}`;
    this.io = io;
    this.fillWithBots = options?.fillWithBots ?? true;
    this.turnTimerSeconds = options?.turnTimerSeconds || 15;

    this.state = {
      roomId: this.id,
      roomName: this.name,
      status: 'waiting',
      players: [],
      currentTurnPlayerId: null,
      turnTimeRemaining: this.turnTimerSeconds,
      turnTimerMax: this.turnTimerSeconds,
      lastPlay: null,
      trickHistory: [],
      roundNumber: 1,
      consecutivePasses: 0,
      isFirstTurnOfGame: true,
      leadPlayerId: null,
      winnerId: null,
      results: null
    };
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  public addPlayer(id: string, name: string, avatar: string = '👤'): Player | null {
    // If player is already in room, reconnect them
    const existing = this.getPlayer(id);
    if (existing) {
      existing.connected = true;
      existing.name = name || existing.name;
      existing.avatar = avatar || existing.avatar;
      this.broadcastState();
      return existing;
    }

    if (this.state.players.length >= 4) {
      if (this.state.status === 'waiting') {
        const botIdx = this.state.players.findIndex(p => p.isBot);
        if (botIdx !== -1) {
          const newPlayer: Player = {
            id,
            name: name || `Pemain ${botIdx + 1}`,
            avatar: avatar || '👤',
            isBot: false,
            hand: [],
            cardCount: 0,
            passed: false,
            connected: true,
            isHost: false,
            seatIndex: botIdx,
            score: 0
          };
          this.state.players[botIdx] = newPlayer;
          this.broadcastSystemChat(`${newPlayer.name} telah bergabung ke meja (menggantikan Bot).`);
          this.broadcastState();
          return newPlayer;
        }
      }
      return null; // Room full
    }

    const isHost = this.state.players.length === 0;
    const seatIndex = this.state.players.length;

    const newPlayer: Player = {
      id,
      name: name || `Pemain ${seatIndex + 1}`,
      avatar: avatar || '👤',
      isBot: false,
      hand: [],
      cardCount: 0,
      passed: false,
      connected: true,
      isHost,
      seatIndex,
      score: 0
    };

    this.state.players.push(newPlayer);
    this.broadcastSystemChat(`${newPlayer.name} telah bergabung ke meja.`);
    this.broadcastState();
    return newPlayer;
  }

  public removePlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;

    if (this.state.status === 'waiting') {
      this.state.players = this.state.players.filter(p => p.id !== playerId);
      // Reassign seat indexes
      this.state.players.forEach((p, idx) => {
        p.seatIndex = idx;
        p.isHost = idx === 0;
      });
      this.broadcastSystemChat(`${player.name} meninggalkan meja.`);
      this.broadcastState();
    } else {
      // Game in progress: convert human player to bot or mark disconnected
      player.connected = false;
      this.broadcastSystemChat(`${player.name} terputus. AI akan menggantikan sementara.`);
      this.broadcastState();

      // If it's this player's turn, trigger bot move
      if (this.state.currentTurnPlayerId === playerId) {
        this.triggerBotTurnIfNeeded();
      }
    }
  }

  public startGame(): boolean {
    if (this.state.status === 'playing') return false;

    // Fill remaining seats with bots if needed
    if (this.fillWithBots && this.state.players.length < 4) {
      let botNameIdx = 0;
      while (this.state.players.length < 4) {
        const seatIdx = this.state.players.length;
        const botName = BOT_NAMES[botNameIdx % BOT_NAMES.length];
        const botAvatar = BOT_AVATARS[botNameIdx % BOT_AVATARS.length];
        botNameIdx++;

        this.state.players.push({
          id: `bot_${Date.now()}_${seatIdx}`,
          name: botName,
          avatar: botAvatar,
          isBot: true,
          botDifficulty: 'medium',
          hand: [],
          cardCount: 0,
          passed: false,
          connected: true,
          isHost: false,
          seatIndex: seatIdx,
          score: 0
        });
      }
    }

    if (this.state.players.length !== 4) {
      return false; // Exactly 4 players required
    }

    // Deal cards
    const deck = shuffleDeck(createDeck());
    const hands = dealDeck(deck);

    this.state.players.forEach((player, idx) => {
      player.hand = hands[idx];
      player.cardCount = hands[idx].length;
      player.passed = false;
    });

    // Find starter with 3 Waru (3♠)
    const starterIdx = findPlayerWithThreeSpades(hands);
    const starter = this.state.players[starterIdx];

    if (this.state.results) {
      this.state.roundNumber++;
    }

    this.state.status = 'playing';
    this.state.currentTurnPlayerId = starter.id;
    this.state.leadPlayerId = starter.id;
    this.state.lastPlay = null;
    this.state.trickHistory = [];
    this.state.consecutivePasses = 0;
    this.state.isFirstTurnOfGame = true;
    this.state.winnerId = null;
    this.state.results = null;

    this.broadcastSystemChat(`Permainan dimulai! ${starter.name} memegang 3 Waru (3♠) dan membuka langkah pertama.`);
    this.startTurnTimer();
    this.broadcastState();
    this.triggerBotTurnIfNeeded();
    return true;
  }

  public playCards(playerId: string, cardIds: string[]): { success: boolean; error?: string } {
    if (this.state.status !== 'playing') {
      return { success: false, error: 'Permainan belum aktif.' };
    }

    if (this.state.currentTurnPlayerId !== playerId) {
      return { success: false, error: 'Bukan giliran Anda!' };
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Pemain tidak ditemukan.' };
    }

    const playedCards = player.hand.filter(c => cardIds.includes(c.id));
    if (playedCards.length !== cardIds.length) {
      return { success: false, error: 'Beberapa kartu tidak ada di tangan Anda.' };
    }

    const validation = validatePlay(
      playedCards,
      this.state.lastPlay,
      this.state.isFirstTurnOfGame
    );

    if (!validation.valid || !validation.combo) {
      return { success: false, error: validation.error || 'Langkah tidak valid.' };
    }

    // Move is valid! Remove cards from player's hand
    const playedSet = new Set(cardIds);
    player.hand = player.hand.filter(c => !playedSet.has(c.id));
    player.cardCount = player.hand.length;

    const playedTrick: PlayedTrick = {
      playerId: player.id,
      playerName: player.name,
      combo: validation.combo,
      timestamp: Date.now()
    };

    this.state.lastPlay = playedTrick;
    this.state.trickHistory.push(playedTrick);
    this.state.isFirstTurnOfGame = false;
    this.state.leadPlayerId = player.id;
    player.passed = false;

    // Announce the play
    this.broadcastSystemChat(`${player.name} mengeluarkan: ${validation.combo.description}`);

    // Check if player won!
    if (player.hand.length === 0) {
      this.handleGameOver(player);
      return { success: true };
    }

    // Check if all other players had already passed earlier in this trick
    const activeOpponents = this.state.players.filter(p => p.id !== player.id && !p.passed);
    if (activeOpponents.length === 0) {
      this.broadcastSystemChat(`Semua lawan telah lewat! ${player.name} memenangkan putaran dan memimpin babak baru.`);
      this.state.lastPlay = null;
      this.state.trickHistory = [];
      this.state.consecutivePasses = 0;
      this.state.players.forEach(p => (p.passed = false));
      this.state.currentTurnPlayerId = player.id;
      this.state.leadPlayerId = player.id;
      this.startTurnTimer();
      this.broadcastState();
      this.triggerBotTurnIfNeeded();
      return { success: true };
    }

    // Advance to next clockwise player
    this.advanceTurn();
    return { success: true };
  }

  public passTurn(playerId: string): { success: boolean; error?: string } {
    if (this.state.status !== 'playing') {
      return { success: false, error: 'Permainan belum aktif.' };
    }

    if (this.state.currentTurnPlayerId !== playerId) {
      return { success: false, error: 'Bukan giliran Anda!' };
    }

    if (this.state.isFirstTurnOfGame) {
      return { success: false, error: 'Pemain dengan 3 Waru tidak boleh lewat pada giliran pertama!' };
    }

    if (!this.state.lastPlay) {
      return { success: false, error: 'Anda memiliki giliran bebas, Anda harus memimpin kartu!' };
    }

    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Pemain tidak ditemukan.' };

    player.passed = true;
    this.broadcastSystemChat(`${player.name} memilih Lewat (Pass).`);

    const passedCount = this.state.players.filter(p => p.passed).length;
    this.state.consecutivePasses = passedCount;

    // If 3 players have passed, trick is over!
    if (passedCount >= 3) {
      const winner = this.getPlayer(this.state.leadPlayerId || '') || player;
      this.broadcastSystemChat(`Semua pemain lewat! ${winner.name} memenangkan putaran dan memimpin babak baru.`);
      this.state.lastPlay = null;
      this.state.trickHistory = [];
      this.state.consecutivePasses = 0;
      this.state.players.forEach(p => (p.passed = false));

      // Trick winner gets the next turn!
      this.state.currentTurnPlayerId = winner.id;
      this.state.leadPlayerId = winner.id;
      this.startTurnTimer();
      this.broadcastState();
      this.triggerBotTurnIfNeeded();
      return { success: true };
    }

    this.advanceTurn();
    return { success: true };
  }

  private advanceTurn(): void {
    const currentIdx = this.state.players.findIndex(p => p.id === this.state.currentTurnPlayerId);
    let nextIdx = (currentIdx + 1) % 4;
    while (this.state.players[nextIdx].passed) {
      nextIdx = (nextIdx + 1) % 4;
    }

    this.state.currentTurnPlayerId = this.state.players[nextIdx].id;
    this.startTurnTimer();
    this.broadcastState();
    this.triggerBotTurnIfNeeded();
  }

  private startTurnTimer(): void {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }

    this.state.turnTimeRemaining = this.turnTimerSeconds;
    this.state.turnTimerMax = this.turnTimerSeconds;

    this.turnInterval = setInterval(() => {
      this.state.turnTimeRemaining--;

      this.io.to(this.id).emit('turn_tick', {
        timeRemaining: this.state.turnTimeRemaining,
        playerId: this.state.currentTurnPlayerId
      });

      if (this.state.turnTimeRemaining <= 0) {
        if (this.turnInterval) {
          clearInterval(this.turnInterval);
          this.turnInterval = null;
        }
        this.handleTurnTimeout();
      }
    }, 1000);
  }

  private handleTurnTimeout(): void {
    if (this.state.status !== 'playing' || !this.state.currentTurnPlayerId) return;

    const currentPlayer = this.getPlayer(this.state.currentTurnPlayerId);
    if (!currentPlayer) return;

    // Timeout: bot logic takes the move automatically
    const move = decideBotMove(currentPlayer.hand, this.state.lastPlay, this.state.isFirstTurnOfGame);

    if (move && move.length > 0) {
      this.playCards(currentPlayer.id, move.map(c => c.id));
    } else {
      if (this.state.isFirstTurnOfGame || !this.state.lastPlay) {
        // Must play something
        const fallback = currentPlayer.hand.find(c => c.isThreeSpades) || currentPlayer.hand[0];
        this.playCards(currentPlayer.id, [fallback.id]);
      } else {
        this.passTurn(currentPlayer.id);
      }
    }
  }

  private triggerBotTurnIfNeeded(): void {
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }

    if (this.state.status !== 'playing' || !this.state.currentTurnPlayerId) return;

    const currentPlayer = this.getPlayer(this.state.currentTurnPlayerId);
    if (!currentPlayer) return;

    // Trigger if player is a bot or if human is currently disconnected
    if (currentPlayer.isBot || !currentPlayer.connected) {
      // Natural thinking delay between 900ms and 1500ms
      const delay = Math.floor(Math.random() * 600) + 900;
      this.botTimeout = setTimeout(() => {
        if (this.state.status !== 'playing' || this.state.currentTurnPlayerId !== currentPlayer.id) return;

        const move = decideBotMove(currentPlayer.hand, this.state.lastPlay, this.state.isFirstTurnOfGame);

        if (move && move.length > 0) {
          this.playCards(currentPlayer.id, move.map(c => c.id));
        } else {
          if (this.state.isFirstTurnOfGame || !this.state.lastPlay) {
            const fallback = currentPlayer.hand.find(c => c.isThreeSpades) || currentPlayer.hand[0];
            this.playCards(currentPlayer.id, [fallback.id]);
          } else {
            this.passTurn(currentPlayer.id);
          }
        }
      }, delay);
    }
  }

  private handleGameOver(winner: Player): void {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }

    this.state.status = 'game_over';
    this.state.winnerId = winner.id;

    // Calculate ranking and penalty scores:
    // 1 card = 1 penalty pt. If holding a Poker (2), penalty is doubled!
    const results: GameResult[] = this.state.players.map(p => {
      let penalty = p.hand.length;
      const hasPoker = p.hand.some(c => c.isPoker);
      if (hasPoker) {
        penalty *= 2; // Capsa banting rule: caught holding Poker doubles penalty!
      }
      const scoreDelta = p.id === winner.id ? +30 : -penalty;
      p.score += scoreDelta;

      return {
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        rank: p.id === winner.id ? 1 : 2, // will be sorted
        remainingCards: p.hand.length,
        scoreDelta,
        isWinner: p.id === winner.id
      };
    });

    // Sort non-winners by remaining cards ascending
    results.sort((a, b) => {
      if (a.isWinner) return -1;
      if (b.isWinner) return 1;
      return a.remainingCards - b.remainingCards;
    });

    results.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    this.state.results = results;
    this.broadcastSystemChat(`🏆 ${winner.name} TELAH MEMENANGKAN PERTANDINGAN!`);
    this.broadcastState();
  }

  public addChatMessage(senderId: string, text: string): ChatMessage | null {
    const player = this.getPlayer(senderId);
    if (!player) return null;

    const cleanText = (text || '').trim().substring(0, 150);
    if (!cleanText) return null;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: player.id,
      senderName: player.name,
      text: cleanText,
      isSystem: false,
      timestamp: Date.now()
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 50) this.chatMessages.shift();
    this.io.to(this.id).emit('chat_message', message);
    return message;
  }

  public broadcastSystemChat(text: string): void {
    const message: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'Sistem',
      text,
      isSystem: true,
      timestamp: Date.now()
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 50) this.chatMessages.shift();
    this.io.to(this.id).emit('chat_message', message);
  }

  public broadcastState(): void {
    // Send customized state to each socket so opponents' hidden cards aren't exposed
    const sockets = this.io.sockets.adapter.rooms.get(this.id);
    if (!sockets) return;

    for (const socketId of sockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) continue;

      const playerId = (socket as any).playerId;
      const clientState = this.sanitizeStateForPlayer(playerId);
      socket.emit('game_state', clientState);
    }
  }

  public sanitizeStateForPlayer(playerId: string): GameState {
    return {
      ...this.state,
      players: this.state.players.map(p => {
        // If it's the player's own hand, send full cards
        // If it's opponent or bot, hide card details unless game is over
        if (p.id === playerId || this.state.status === 'game_over') {
          return p;
        }

        return {
          ...p,
          hand: p.hand.map(c => ({
            id: c.id,
            rank: 0,
            suit: 'S' as const,
            suitValue: 0,
            rankLabel: '?',
            suitSymbol: '?',
            suitName: '?',
            color: 'black' as const,
            isPoker: false,
            isAce: false,
            isThreeSpades: false
          }))
        };
      })
    };
  }

  public resetForNextGame(): void {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }

    this.state.status = 'waiting';
    this.state.lastPlay = null;
    this.state.trickHistory = [];
    this.state.consecutivePasses = 0;
    this.state.winnerId = null;
    this.state.results = null;
    this.state.players.forEach(p => {
      p.hand = [];
      p.cardCount = 0;
      p.passed = false;
    });

    this.broadcastSystemChat('Meja siap untuk ronde berikutnya. Klik Mulai saat siap!');
    this.broadcastState();
  }

  public cleanup(): void {
    if (this.turnInterval) clearInterval(this.turnInterval);
    if (this.botTimeout) clearTimeout(this.botTimeout);
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(roomName?: string, options?: RoomOptions, specificId?: string): Room {
    const id = specificId ? specificId.toUpperCase() : this.generateRoomCode();
    const room = new Room(id, roomName || `Meja ${id}`, this.io, options);
    this.rooms.set(id, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public listPublicRooms(): RoomListItem[] {
    const list: RoomListItem[] = [];
    for (const room of this.rooms.values()) {
      list.push({
        roomId: room.id,
        roomName: room.name,
        playerCount: room.state.players.length,
        status: room.state.status
      });
    }
    return list;
  }

  public deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.cleanup();
      this.rooms.delete(roomId);
    }
  }
}
