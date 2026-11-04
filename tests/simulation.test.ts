import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealDeck, findPlayerWithThreeSpades } from '../src/shared/deck.js';
import { decideBotMove } from '../src/shared/bot.js';
import { validatePlay, evaluateCombo } from '../src/shared/engine.js';
import { PlayedTrick } from '../src/shared/types.js';
import { Room } from '../src/server/roomManager.js';

describe('End-to-End Game Simulation', () => {
  it('successfully simulates 30 full 4-player games with round-by-round passing (muter masih bisa jalan lagi)', () => {
    const NUM_GAMES = 30;

    for (let g = 0; g < NUM_GAMES; g++) {
      const deck = shuffleDeck(createDeck());
      const hands = dealDeck(deck, 4);

      let currentTurn = findPlayerWithThreeSpades(hands);
      expect(currentTurn).toBeGreaterThanOrEqual(0);
      expect(currentTurn).toBeLessThan(4);

      let isFirstTurnOfGame = true;
      let lastPlay: PlayedTrick | null = null;
      let leadPlayer = currentTurn;
      let consecutivePasses = 0;
      let winner = -1;
      let turnCount = 0;
      const MAX_TURNS = 350;

      while (winner === -1 && turnCount < MAX_TURNS) {
        turnCount++;
        const currentHand = hands[currentTurn];
        const move = decideBotMove(currentHand, lastPlay, isFirstTurnOfGame);

        if (move !== null) {
          // Validate play against engine rules
          const validation = validatePlay(move, lastPlay, isFirstTurnOfGame);
          expect(validation.valid, `Game ${g} turn ${turnCount} invalid move: ${validation.error}`).toBe(true);

          // Remove played cards from hand
          const playedIds = new Set(move.map(c => c.id));
          hands[currentTurn] = currentHand.filter(c => !playedIds.has(c.id));

          lastPlay = {
            playerId: `player_${currentTurn}`,
            playerName: `Bot ${currentTurn}`,
            combo: validation.combo!,
            timestamp: Date.now()
          };

          leadPlayer = currentTurn;
          consecutivePasses = 0; // Reset pass counter saat ada kartu baru
          isFirstTurnOfGame = false;

          // Check for win
          if (hands[currentTurn].length === 0) {
            winner = currentTurn;
            break;
          }

          // Advance to next clockwise player
          currentTurn = (currentTurn + 1) % 4;
        } else {
          // Player chose to pass (Lewat)
          expect(isFirstTurnOfGame, 'Opening player cannot pass on first turn').toBe(false);
          consecutivePasses++;

          if (consecutivePasses >= 3) {
            // Trick over! Lead player gets a clean table
            lastPlay = null;
            consecutivePasses = 0;
            currentTurn = leadPlayer;
          } else {
            // Advance to next clockwise player (muter masih bisa jalan lagi)
            currentTurn = (currentTurn + 1) % 4;
          }
        }
      }

      expect(winner, `Game ${g} did not complete within ${MAX_TURNS} turns`).toBeGreaterThanOrEqual(0);
      expect(hands[winner].length).toBe(0);
    }
  });

  it('runs complete 3-player games without bots where all 52 cards are dealt completely', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('SIM3P', '3 Player Room', mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
    room.addPlayer('u1', 'User 1');
    room.addPlayer('u2', 'User 2');
    room.addPlayer('u3', 'User 3');
    expect(room.startGame()).toBe(true);
    expect(room.state.status).toBe('playing');
    expect(room.state.players).toHaveLength(3);

    // Verify 52 cards are dealt completely (18 + 17 + 17 = 52)
    const totalCards = room.state.players.reduce((sum, p) => sum + p.cardCount, 0);
    expect(totalCards).toBe(52);

    let turns = 0;
    while (room.state.status === 'playing' && turns < 300) {
      turns++;
      const currentPid = room.state.currentTurnPlayerId!;
      const currentPlayer = room.getPlayer(currentPid)!;
      const move = decideBotMove(currentPlayer.hand, room.state.lastPlay, room.state.isFirstTurnOfGame);

      if (move && move.length > 0) {
        const res = room.playCards(currentPid, move.map(c => c.id));
        expect(res.success).toBe(true);
      } else {
        const res = room.passTurn(currentPid);
        expect(res.success).toBe(true);
      }
    }

    expect(room.state.status).toBe('game_over');
    expect(room.state.winnerId).toBeDefined();
    expect(room.state.results).toHaveLength(3);
  });

  it('runs complete 2-player duel games without bots where all 52 cards are dealt (26 cards each)', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    for (let sim = 0; sim < 5; sim++) {
      const room = new Room(`SIM2P_${sim}`, `2 Player Room ${sim}`, mockIo, { fillWithBots: false, turnTimerSeconds: 15 });
      room.addPlayer('u1', 'Duelist 1');
      room.addPlayer('u2', 'Duelist 2');
      expect(room.startGame()).toBe(true);
      expect(room.state.status).toBe('playing');
      expect(room.state.players).toHaveLength(2);

      // Verify exactly 26 cards each
      expect(room.state.players[0].cardCount).toBe(26);
      expect(room.state.players[1].cardCount).toBe(26);
      expect(room.state.players[0].hand).toHaveLength(26);
      expect(room.state.players[1].hand).toHaveLength(26);

      let turns = 0;
      while (room.state.status === 'playing' && turns < 350) {
        turns++;
        const currentPid = room.state.currentTurnPlayerId!;
        const currentPlayer = room.getPlayer(currentPid)!;
        const move = decideBotMove(currentPlayer.hand, room.state.lastPlay, room.state.isFirstTurnOfGame);

        if (move && move.length > 0) {
          const res = room.playCards(currentPid, move.map(c => c.id));
          expect(res.success).toBe(true);
        } else {
          const res = room.passTurn(currentPid);
          expect(res.success).toBe(true);
        }
      }

      expect(room.state.status).toBe('game_over');
      expect(room.state.winnerId).toBeDefined();
      expect(room.state.results).toHaveLength(2);
      expect(room.state.results?.[0].rank).toBe(1);
      expect(room.state.results?.[0].isWinner).toBe(true);
      expect(room.state.results?.[0].scoreDelta).toBe(30);
      expect(room.state.results?.[1].rank).toBe(2);
      expect(room.state.results?.[1].isWinner).toBe(false);
    }
  });

  it('runs complete games through the actual server Room class directly', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      sockets: { adapter: { rooms: new Map() }, sockets: new Map() }
    } as any;

    const room = new Room('SIM1', 'Simulation Room', mockIo, { fillWithBots: true, turnTimerSeconds: 15 });
    room.addPlayer('p0', 'Player 0');
    expect(room.startGame()).toBe(true);
    expect(room.state.status).toBe('playing');
    expect(room.state.players).toHaveLength(4);

    let turns = 0;
    while (room.state.status === 'playing' && turns < 250) {
      turns++;
      const currentPid = room.state.currentTurnPlayerId!;
      const currentPlayer = room.getPlayer(currentPid)!;
      const move = decideBotMove(currentPlayer.hand, room.state.lastPlay, room.state.isFirstTurnOfGame);

      if (move && move.length > 0) {
        const res = room.playCards(currentPid, move.map(c => c.id));
        expect(res.success).toBe(true);
      } else {
        const res = room.passTurn(currentPid);
        expect(res.success).toBe(true);
      }
    }

    expect(room.state.status).toBe('game_over');
    expect(room.state.winnerId).toBeDefined();
    expect(room.state.results).toHaveLength(4);
    const winnerResult = room.state.results?.find(r => r.isWinner);
    expect(winnerResult).toBeDefined();
    expect(winnerResult?.scoreDelta).toBe(30);
  });
});
