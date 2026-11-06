import { Server, Socket } from 'socket.io';
import { Card, GameResult, GameState, Player, PlayedTrick, ChatMessage, RoomListItem, GameRules, DEFAULT_RULES } from '../shared/types.js';
import { createDeck, shuffleDeck, dealDeck, findStarterPlayer, sortCards } from '../shared/deck.js';
import { validatePlay } from '../shared/engine.js';
import { decideBotMove, BOT_NAMES, BOT_AVATARS } from '../shared/bot.js';

export interface RoomOptions {
  roomName?: string;
  fillWithBots?: boolean;
  turnTimerSeconds?: number;
  maxPlayers?: number;
  rules?: Partial<GameRules>;
}

export class Room {
  public id: string;
  public name: string;
  public fillWithBots: boolean;
  public turnTimerSeconds: number;
  public maxPlayers: number;
  public rules: GameRules;
  public state: GameState;
  public chatMessages: ChatMessage[] = [];
  private io: Server;
  private turnInterval: NodeJS.Timeout | null = null;
  private botTimeout: NodeJS.Timeout | null = null;
  private finishers: string[] = [];

  constructor(id: string, name: string, io: Server, options?: RoomOptions) {
    this.id = id;
    this.name = name || `Meja #${id}`;
    this.io = io;
    this.fillWithBots = options?.fillWithBots ?? false;
    this.turnTimerSeconds = options?.turnTimerSeconds || 15;
    this.maxPlayers = options?.maxPlayers ? Math.min(10, Math.max(2, options.maxPlayers)) : 4;
    this.rules = {
      ...DEFAULT_RULES,
      deckCount: 1,
      discardThrees: true,
      holdingPokerAsLastCardLoses: true,
      pokerCutByBongLoses: true,
      ...(options?.rules || {})
    };
    this.rules.deckCount = 1;

    this.state = {
      roomId: this.id,
      roomName: this.name,
      status: 'waiting',
      players: [],
      maxPlayers: this.maxPlayers,
      fillWithBots: this.fillWithBots,
      rules: this.rules,
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
      results: null,
      hasPokerBooing: false,
      pokerLoserNames: [],
      bongLossInfo: null
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
      this.resumeControl(id);
      this.broadcastState();
      return existing;
    }

    if (this.state.players.length >= this.maxPlayers) {
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
            score: 0,
            isAutoPlay: false
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
      score: 0,
      isAutoPlay: false
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

    // Fill remaining seats with bots if needed up to maxPlayers
    if (this.fillWithBots && this.state.players.length < this.maxPlayers) {
      let botNameIdx = 0;
      while (this.state.players.length < this.maxPlayers) {
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

    if (this.state.players.length < 2 || this.state.players.length > this.maxPlayers) {
      return false; // Butuh minimal 2 pemain hingga maxPlayers
    }

    // Pastikan index kursi terurut rapi
    this.state.players.forEach((player, idx) => {
      player.seatIndex = idx;
    });

    // Deal cards (strictly 1 deck of 52 cards, divided cleanly among all players)
    const deck = shuffleDeck(createDeck(1));
    const hands = dealDeck(deck, this.state.players.length);

    this.finishers = [];
    this.state.finishers = [];

    this.state.players.forEach((player, idx) => {
      player.hand = hands[idx];
      player.cardCount = hands[idx].length;
      player.passed = false;
      player.finishRank = null;
      player.isAutoPlay = false;
    });

    // Find starter with opening card before discarding 3s.
    // If discardThrees is active, the player holding 3 of Spades (3♠ / Waru) ALWAYS starts the game!
    const starterIdx = (this.rules.discardThrees !== false)
      ? findStarterPlayer(hands, '3S')
      : findStarterPlayer(hands, this.rules.openingCard);
    const starter = this.state.players[starterIdx];

    // Automatically discard ALL rank 3 cards from all players' hands!
    if (this.rules.discardThrees !== false) {
      this.state.players.forEach(player => {
        player.hand = player.hand.filter(c => c.rank !== 3);
        player.cardCount = player.hand.length;
      });
      this.rules.discardThrees = true;
    }

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
    this.state.hasPokerBooing = false;
    this.state.pokerLoserNames = [];
    this.state.bongLossInfo = null;

    const starterCardName = (this.rules.discardThrees !== false || this.rules.openingCard === '3S')
      ? '3 Waru (3♠)'
      : (this.rules.openingCard === '3D' ? '3 Wajik (3♦)' : 'angka 3');
    const discardInfo = this.rules.discardThrees !== false ? 'Semua kartu angka 3 telah dibuang. ' : '';
    this.broadcastSystemChat(`Permainan dimulai! ${discardInfo}${starter.name} memegang ${starterCardName} dan membuka langkah pertama.`);
    this.startTurnTimer();
    this.broadcastState();
    this.triggerBotTurnIfNeeded();
    return true;
  }

  public playCards(playerId: string, cardIds: string[], isAutoAction: boolean = false): { success: boolean; error?: string } {
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

    if (!isAutoAction && (player.isAutoPlay || !player.connected)) {
      this.resumeControl(playerId);
    }

    const playedCards = player.hand.filter(c => cardIds.includes(c.id));
    if (playedCards.length !== cardIds.length) {
      return { success: false, error: 'Beberapa kartu tidak ada di tangan Anda.' };
    }

    const validation = validatePlay(
      playedCards,
      this.state.lastPlay,
      this.state.isFirstTurnOfGame,
      this.rules
    );

    if (!validation.valid || !validation.combo) {
      return { success: false, error: validation.error || 'Langkah tidak valid.' };
    }

    // Move is valid! Remove cards from player's hand
    const playedSet = new Set(cardIds);
    player.hand = player.hand.filter(c => !playedSet.has(c.id));
    player.cardCount = player.hand.length;

    const previousPlay = this.state.lastPlay;
    const isLeadPlayPoker =
      Boolean(previousPlay) &&
      (previousPlay!.combo.type === 'SINGLE' || previousPlay!.combo.type === 'PAIR') &&
      previousPlay!.combo.mainRank === 15;

    const isCurrentPlayBong =
      validation.combo.type === 'BONG_FOUR' ||
      validation.combo.type === 'BONG_SF' ||
      validation.combo.type === 'STRAIGHT_FLUSH' ||
      validation.combo.type === 'ROYAL_FLUSH';

    const isCutByOtherPlayer =
      Boolean(previousPlay) && previousPlay!.playerId !== player.id;

    const isBongInstantLoss =
      this.rules.pokerCutByBongLoses !== false &&
      isLeadPlayPoker &&
      isCurrentPlayBong &&
      isCutByOtherPlayer;

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
    this.state.consecutivePasses = 0; // Reset consecutive pass counter setiap kali kartu baru dikeluarkan
    this.state.players.forEach(p => (p.passed = false)); // Reset status lewat: saat giliran berputar, pemain lain masih bisa jalan lagi

    // Sesuai aturan tongkrongan: Pemain buang kartu 2 (Satuan/Pair) lalu dipotong BONG langsung KALAH TELAK seketika!
    if (isBongInstantLoss && previousPlay) {
      const victimPlayerId = previousPlay.playerId;
      const victimPlayer = this.getPlayer(victimPlayerId);

      // If bomber finished all their cards with this BONG move, record them as finisher
      if (player.hand.length === 0 && !this.finishers.includes(player.id)) {
        this.finishers.push(player.id);
      }

      const bongLossData = {
        victimPlayerId,
        victimName: victimPlayer?.name || previousPlay.playerName,
        bomberPlayerId: player.id,
        bomberName: player.name,
        bongType: validation.combo.type,
        bongDescription: validation.combo.description
      };

      this.state.bongLossInfo = bongLossData;
      this.io.to(this.id).emit('poker_bong_instant_loss', bongLossData);

      this.broadcastSystemChat(
        `💥💣 HUUUUUU! ${victimPlayer?.name || previousPlay.playerName} Kena BONG (${validation.combo.description}) oleh ${player.name}! Langsung Modar / Kalah Telak! 💀`
      );

      this.handleGameOver(victimPlayerId, player.id);
      return { success: true };
    }

    // Check if THIS player just ran out of cards!
    if (player.hand.length === 0 && !player.finishRank) {
      // Sesuai aturan default: jika pemain memegang kartu 2 (Poker) sebagai kartu terakhir untuk menutup game,
      // dia langsung dinyatakan kalah telak dan seluruh pemain lain langsung menang!
      const isPokerFinish = playedCards.some(c => c.isPoker || c.rank === 15);
      if (this.rules.holdingPokerAsLastCardLoses !== false && isPokerFinish) {
        player.hand = playedCards; // Kembalikan kartu untuk perhitungan penalti kartu poker
        player.cardCount = player.hand.length;
        this.broadcastSystemChat(
          `💥 HUUUUUU! 👎 ${player.name} memegang kartu 2 (Poker) sebagai kartu terakhir! Sesuai aturan, ${player.name} langsung dinyatakan kalah telak dan pemain lain langsung menang!`
        );
        this.handleGameOver(player.id);
        return { success: true };
      }
      const rank = this.finishers.length + 1;
      player.finishRank = rank;
      this.finishers.push(player.id);
      this.state.finishers = [...this.finishers];

      const trophy = rank === 1 ? '🥇 Juara 1' : rank === 2 ? '🥈 Juara 2' : rank === 3 ? '🥉 Juara 3' : `Peringkat ${rank}`;
      this.broadcastSystemChat(`🎉 ${player.name} telah menghabiskan semua kartunya sebagai ${trophy}!`);

      // Check remaining active players with cards
      const remainingActive = this.state.players.filter(p => p.hand.length > 0);
      if (remainingActive.length <= 1) {
        // Hanya tersisa 1 pemegang kartu terakhir -> Game selesai!
        if (remainingActive.length === 1) {
          const lastPlayer = remainingActive[0];
          this.broadcastSystemChat(`🏁 Permainan selesai! ${lastPlayer.name} memegang kartu terakhir.`);
        }
        this.handleGameOver();
        return { success: true };
      }
    }

    // Advance to next clockwise player who still has cards
    this.advanceTurn();
    return { success: true };
  }

  public passTurn(playerId: string, isAutoAction: boolean = false): { success: boolean; error?: string } {
    if (this.state.status !== 'playing') {
      return { success: false, error: 'Permainan belum aktif.' };
    }

    if (this.state.currentTurnPlayerId !== playerId) {
      return { success: false, error: 'Bukan giliran Anda!' };
    }

    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Pemain tidak ditemukan.' };

    if (!isAutoAction && (player.isAutoPlay || !player.connected)) {
      this.resumeControl(playerId);
    }

    if (this.state.isFirstTurnOfGame) {
      return { success: false, error: 'Pemain pembuka tidak boleh lewat pada giliran pertama!' };
    }

    if (!this.state.lastPlay) {
      return { success: false, error: 'Anda memiliki giliran bebas, Anda harus memimpin kartu!' };
    }

    player.passed = true;

    this.state.consecutivePasses++;
    const activePlayers = this.state.players.filter(p => p.hand.length > 0);
    const isLeadActive = (this.getPlayer(this.state.leadPlayerId || '')?.hand.length || 0) > 0;
    const requiredPasses = isLeadActive ? activePlayers.length - 1 : activePlayers.length;

    // Jika seluruh pemain aktif lain berturut-turut lewat, putaran berakhir!
    if (this.state.consecutivePasses >= requiredPasses) {
      let winner: Player;
      if (isLeadActive) {
        winner = this.getPlayer(this.state.leadPlayerId || '') || player;
      } else {
        // Jika pemenang putaran sebelumnya sudah habis kartunya, serahkan meja bebas ke pemain aktif berikutnya
        winner = this.getNextActivePlayer(this.state.leadPlayerId || '');
      }

      this.state.lastPlay = null;
      this.state.trickHistory = [];
      this.state.consecutivePasses = 0;
      this.state.players.forEach(p => (p.passed = false));

      // Pemenang putaran berhak memimpin kartu di meja bebas
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

  private getNextActivePlayer(fromPlayerId: string): Player {
    const total = this.state.players.length;
    let idx = this.state.players.findIndex(p => p.id === fromPlayerId);
    if (idx === -1) idx = 0;
    for (let i = 1; i <= total; i++) {
      const next = this.state.players[(idx + i) % total];
      if (next.hand.length > 0) {
        return next;
      }
    }
    return this.state.players[idx];
  }

  private advanceTurn(): void {
    const activePlayers = this.state.players.filter(p => p.hand.length > 0);
    if (activePlayers.length <= 1) {
      this.handleGameOver();
      return;
    }

    const nextPlayer = this.getNextActivePlayer(this.state.currentTurnPlayerId || '');
    this.state.currentTurnPlayerId = nextPlayer.id;
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

  public resumeControl(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player || player.isBot) return false;

    const wasAutoPlay = Boolean(player.isAutoPlay);
    const wasDisconnected = !player.connected;

    if (!wasAutoPlay && !wasDisconnected) {
      return false;
    }

    player.isAutoPlay = false;
    player.connected = true;

    if (wasAutoPlay) {
      this.broadcastSystemChat(`🎮 ${player.name} kembali mengambil alih permainan (ON).`);
    }

    if (this.state.currentTurnPlayerId === playerId) {
      if (this.botTimeout) {
        clearTimeout(this.botTimeout);
        this.botTimeout = null;
      }
      this.startTurnTimer();
    }

    this.broadcastState();
    return true;
  }

  public handleTurnTimeout(): void {
    if (this.state.status !== 'playing' || !this.state.currentTurnPlayerId) return;

    const currentPlayer = this.getPlayer(this.state.currentTurnPlayerId);
    if (!currentPlayer) return;

    // Timeout: player did not act / touch cards in this turn.
    // Next turns will be taken over by bot (auto-play / AFK takeover)
    if (!currentPlayer.isBot && !currentPlayer.isAutoPlay) {
      currentPlayer.isAutoPlay = true;
      this.broadcastSystemChat(`⏳ ${currentPlayer.name} tidak merespons dalam 1 giliran. Giliran selanjutnya akan dimainkan otomatis oleh Bot.`);
    }

    // Bot logic takes the move automatically
    const move = decideBotMove(currentPlayer.hand, this.state.lastPlay, this.state.isFirstTurnOfGame, this.rules);

    if (move && move.length > 0) {
      this.playCards(currentPlayer.id, move.map(c => c.id), true);
    } else {
      if (this.state.isFirstTurnOfGame || !this.state.lastPlay) {
        // Must play something
        const fallback = (this.state.isFirstTurnOfGame
          ? (this.rules.openingCard === '3D'
              ? currentPlayer.hand.find(c => c.rank === 3 && c.suit === 'D')
              : this.rules.openingCard === '3S'
              ? currentPlayer.hand.find(c => c.isThreeSpades || (c.rank === 3 && c.suit === 'S'))
              : null) || currentPlayer.hand.find(c => c.rank === 3)
          : null) || currentPlayer.hand[0];
        this.playCards(currentPlayer.id, [fallback.id], true);
      } else {
        this.passTurn(currentPlayer.id, true);
      }
    }
  }

  public triggerBotTurnIfNeeded(): void {
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }

    if (this.state.status !== 'playing' || !this.state.currentTurnPlayerId) return;

    const currentPlayer = this.getPlayer(this.state.currentTurnPlayerId);
    if (!currentPlayer) return;

    // Trigger if player is a bot or if human is currently disconnected or in auto-play (AFK takeover)
    if (currentPlayer.isBot || !currentPlayer.connected || currentPlayer.isAutoPlay) {
      // Natural thinking delay: bots play quickly (800-1300ms),
      // but on the first turn when discardThrees is active, wait (6000-6400ms)
      // so the 4-step discard-3 animation finishes and is clearly seen by players!
      const delay = currentPlayer.isBot
        ? (this.state.isFirstTurnOfGame && this.rules.discardThrees !== false
            ? Math.floor(Math.random() * 400) + 6000
            : this.state.isFirstTurnOfGame
            ? Math.floor(Math.random() * 400) + 1600
            : Math.floor(Math.random() * 500) + 800)
        : Math.floor(Math.random() * 800) + 2500;

      this.botTimeout = setTimeout(() => {
        if (this.state.status !== 'playing' || this.state.currentTurnPlayerId !== currentPlayer.id) return;
        // Strictly prevent bot move if human has taken back control
        if (!currentPlayer.isBot && currentPlayer.connected && !currentPlayer.isAutoPlay) return;

        const move = decideBotMove(currentPlayer.hand, this.state.lastPlay, this.state.isFirstTurnOfGame, this.rules);

        if (move && move.length > 0) {
          this.playCards(currentPlayer.id, move.map(c => c.id), true);
        } else {
          if (this.state.isFirstTurnOfGame || !this.state.lastPlay) {
            const fallback = (this.state.isFirstTurnOfGame
              ? (this.rules.openingCard === '3D'
                  ? currentPlayer.hand.find(c => c.rank === 3 && c.suit === 'D')
                  : this.rules.openingCard === '3S'
                  ? currentPlayer.hand.find(c => c.isThreeSpades || (c.rank === 3 && c.suit === 'S'))
                  : null) || currentPlayer.hand.find(c => c.rank === 3)
              : null) || currentPlayer.hand[0];
            this.playCards(currentPlayer.id, [fallback.id], true);
          } else {
            this.passTurn(currentPlayer.id, true);
          }
        }
      }, delay);
    }
  }

  private handleGameOver(instantPokerLoserId?: string, bomberPlayerId?: string): void {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
    if (this.botTimeout) {
      clearTimeout(this.botTimeout);
      this.botTimeout = null;
    }

    // 1. Pemain yang sudah berhasil menghabiskan seluruh kartunya sebelum game over
    const finishedPlayers = this.state.players.filter(p => p.hand.length === 0 && p.id !== instantPokerLoserId);
    finishedPlayers.sort((a, b) => {
      const idxA = this.finishers.indexOf(a.id);
      const idxB = this.finishers.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

    // 2. Pemain yang masih memegang sisa kartu saat permainan berakhir
    const remainingPlayers = this.state.players.filter(p => p.hand.length > 0);

    let finalOrder: Player[] = [];
    let pokerLosers: Player[] = [];

    const totalPlayers = this.state.players.length;
    const isInstantPokerLoss = Boolean(instantPokerLoserId);

    if (isInstantPokerLoss && instantPokerLoserId) {
      // Saat kalah instan kartu 2 (kartu terakhir atau kena BONG):
      // Hanya pemain yang melanggar yang menjadi pecundang kartu poker!
      // Seluruh pemain lain diurutkan berdasarkan sisa kartu, dengan bomber diprioritaskan sebagai pemenang.
      const instantLoser = this.getPlayer(instantPokerLoserId);
      const otherRemaining = remainingPlayers.filter(p => p.id !== instantPokerLoserId);

      otherRemaining.sort((a, b) => {
        if (bomberPlayerId) {
          if (a.id === bomberPlayerId) return -1;
          if (b.id === bomberPlayerId) return 1;
        }
        return a.hand.length - b.hand.length;
      });

      finalOrder = [
        ...finishedPlayers,
        ...otherRemaining,
        ...(instantLoser ? [instantLoser] : [])
      ];
      pokerLosers = instantLoser ? [instantLoser] : [];
    } else {
      // Game over normal: Pemegang kartu poker diurutkan di belakang pemain non-poker
      const remainingWithoutPoker = remainingPlayers.filter(
        p => !p.hand.some(c => c.isPoker || c.rank === 15)
      );
      const remainingWithPoker = remainingPlayers.filter(
        p => p.hand.some(c => c.isPoker || c.rank === 15)
      );

      remainingWithoutPoker.sort((a, b) => a.hand.length - b.hand.length);
      remainingWithPoker.sort((a, b) => {
        const pokerA = a.hand.filter(c => c.isPoker || c.rank === 15).length;
        const pokerB = b.hand.filter(c => c.isPoker || c.rank === 15).length;
        if (pokerA !== pokerB) {
          return pokerA - pokerB; // Sedikit kartu poker lebih baik daripada banyak kartu poker
        }
        return a.hand.length - b.hand.length;
      });

      finalOrder = [
        ...finishedPlayers,
        ...remainingWithoutPoker,
        ...remainingWithPoker
      ];
      pokerLosers = remainingWithPoker;
    }

    // Berikan peringkat 1..N
    finalOrder.forEach((player, idx) => {
      player.finishRank = idx + 1;
    });

    this.finishers = finalOrder.map(p => p.id);
    this.state.finishers = [...this.finishers];

    this.state.status = 'game_over';
    this.state.winnerId = this.finishers[0] || null;

    const winner = this.getPlayer(this.finishers[0] || '');

    // Cek pemain yang kena booing karena memegang kartu poker
    this.state.hasPokerBooing = pokerLosers.length > 0;
    this.state.pokerLoserNames = pokerLosers.map(p => p.name);

    const results: GameResult[] = this.state.players.map(p => {
      const rank = p.finishRank || (this.finishers.indexOf(p.id) + 1);
      const pokerCards = p.hand.filter(c => c.isPoker || c.rank === 15);
      const isThisInstantLoser = isInstantPokerLoss && p.id === instantPokerLoserId;
      const hasPoker = isInstantPokerLoss ? isThisInstantLoser : pokerCards.length > 0;

      let penalty = p.hand.length;
      if (hasPoker) {
        // Double penalty per poker card held (minimum 5 cards base for instant poker loser even if hand was emptied)
        const baseCount = isThisInstantLoser ? Math.max(p.hand.length, 5) : p.hand.length;
        penalty = baseCount * Math.pow(2, Math.max(1, pokerCards.length));
      }

      let scoreDelta = 0;
      if (rank === 1) {
        scoreDelta = 30;
      } else if (rank === 2 && (p.hand.length === 0 || (isInstantPokerLoss && totalPlayers >= 4))) {
        scoreDelta = totalPlayers >= 4 ? 10 : 0;
      } else if (hasPoker) {
        scoreDelta = -penalty;
      } else if (isInstantPokerLoss) {
        // Jika game berakhir seketika karena pemain lawan memegang kartu 2 sebagai kartu terakhir atau kena BONG,
        // seluruh pemain lain menang tanpa penalti minus!
        scoreDelta = 0;
      } else {
        scoreDelta = -penalty;
      }

      p.score += scoreDelta;

      return {
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        rank,
        remainingCards: p.hand.length,
        scoreDelta,
        isWinner: rank === 1,
        caughtHoldingPoker: hasPoker,
        pokerCardsCount: hasPoker ? Math.max(1, pokerCards.length) : 0,
        lostByBongCut: Boolean(isThisInstantLoser && bomberPlayerId),
        bombedByPlayerId: isThisInstantLoser && bomberPlayerId ? bomberPlayerId : undefined
      };
    });

    // Urutkan hasil berdasarkan peringkat 1, 2, 3, 4
    results.sort((a, b) => a.rank - b.rank);

    this.state.results = results;
    if (winner) {
      this.broadcastSystemChat(`🏆 ${winner.name} ADALAH JUARA 1 PERTANDINGAN!`);
    }

    if (pokerLosers.length > 0) {
      const loserNames = pokerLosers.map(p => p.name).join(', ');
      this.broadcastSystemChat(
        `📢 HUUUUUU! 👎 ${loserNames} masih memegang kartu Poker (angka 2) di akhir permainan dan langsung kalah!`
      );
    }

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
    this.state.hasPokerBooing = false;
    this.state.pokerLoserNames = [];
    this.state.bongLossInfo = null;
    this.finishers = [];
    this.state.finishers = [];
    this.state.players.forEach(p => {
      p.hand = [];
      p.cardCount = 0;
      p.passed = false;
      p.finishRank = null;
      p.isAutoPlay = false;
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
        maxPlayers: room.maxPlayers,
        status: room.state.status,
        fillWithBots: room.fillWithBots,
        rules: room.rules
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
