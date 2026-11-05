import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealDeck, findStarterPlayer } from '../src/shared/deck.js';
import { DEFAULT_RULES, POKER_JAWA_RULES, GameState, Player, Card } from '../src/shared/types.js';
import { decideBotMove } from '../src/shared/bot.js';
import { validatePlay, evaluateCombo } from '../src/shared/engine.js';

describe('Multiplayer 2 to 10 Players Support', () => {
  describe('Deck Creation and Dealing across 2 to 10 players', () => {
    it('creates strictly 1 deck (52 cards) and never exceeds 52 cards', () => {
      const single = createDeck(1);
      expect(single).toHaveLength(52);
      expect(new Set(single.map(c => c.id)).size).toBe(52);

      const doubleAttempt = createDeck(2);
      expect(doubleAttempt).toHaveLength(52);
      expect(new Set(doubleAttempt.map(c => c.id)).size).toBe(52);
    });

    it('deals 52 cards cleanly for 2, 3, 4, and 5 players (1 deck)', () => {
      // 2 players: 26 each
      const h2 = dealDeck(shuffleDeck(createDeck(1)), 2);
      expect(h2).toHaveLength(2);
      expect(h2[0].length + h2[1].length).toBe(52);
      expect(h2[0].length).toBe(26);
      expect(h2[1].length).toBe(26);

      // 3 players: 18, 17, 17
      const h3 = dealDeck(shuffleDeck(createDeck(1)), 3);
      expect(h3).toHaveLength(3);
      expect(h3.reduce((s, h) => s + h.length, 0)).toBe(52);
      expect(h3[0].length).toBe(18);

      // 4 players: 13 each
      const h4 = dealDeck(shuffleDeck(createDeck(1)), 4);
      expect(h4).toHaveLength(4);
      for (const h of h4) expect(h.length).toBe(13);

      // 5 players: 11, 11, 10, 10, 10
      const h5 = dealDeck(shuffleDeck(createDeck(1)), 5);
      expect(h5).toHaveLength(5);
      expect(h5.reduce((s, h) => s + h.length, 0)).toBe(52);
      expect(h5[0].length).toBe(11);
      expect(h5[4].length).toBe(10);
    });

    it('deals 52 cards cleanly for 6, 7, 8, 9, and 10 players (strictly <= 52 cards)', () => {
      for (let pCount = 6; pCount <= 10; pCount++) {
        const hands = dealDeck(shuffleDeck(createDeck(1)), pCount);
        expect(hands).toHaveLength(pCount);
        const total = hands.reduce((s, h) => s + h.length, 0);
        expect(total).toBe(52);

        // Every player gets at least 5 cards
        for (const h of hands) {
          expect(h.length).toBeGreaterThanOrEqual(5);
        }
      }
    });

    it('findStarterPlayer correctly finds starter for 3S, 3D, and any 3', () => {
      const deck = shuffleDeck(createDeck(1));
      const hands = dealDeck(deck, 4);

      const starter3S = findStarterPlayer(hands, '3S');
      expect(hands[starter3S].some(c => c.rank === 3 && c.suit === 'S')).toBe(true);

      const starter3D = findStarterPlayer(hands, '3D');
      expect(hands[starter3D].some(c => c.rank === 3 && c.suit === 'D')).toBe(true);

      const starterAny3 = findStarterPlayer(hands, 'any_3');
      expect(hands[starterAny3].some(c => c.rank === 3)).toBe(true);
    });
  });

  describe('Full Game Simulations (2-10 players)', () => {
    // Helper to simulate a full game among N bots
    const simulateGame = (numPlayers: number, rules = DEFAULT_RULES) => {
      const deck = shuffleDeck(createDeck(1));
      const hands = dealDeck(deck, numPlayers);
      const starterIdx = findStarterPlayer(hands, rules.openingCard);

      const players: Player[] = hands.map((hand, idx) => {
        const finalHand = rules.discardThrees ? hand.filter(c => c.rank !== 3) : [...hand];
        return {
          id: `player_${idx}`,
          name: `Bot ${idx + 1}`,
          avatar: '🤖',
          isHost: idx === 0,
          isBot: true,
          hand: finalHand,
          cardCount: finalHand.length,
          seatIndex: idx,
          passed: false,
          connected: true,
          score: 0
        };
      });

      let currentTurnIdx = starterIdx;
      let lastPlay: any = null;
      let isFirstTurn = true;
      let consecutivePasses = 0;
      let finishRankCounter = 1;
      let turnsCount = 0;
      const maxTurns = 2000;

      while (turnsCount < maxTurns) {
        turnsCount++;
        const activePlayersWithCards = players.filter(p => p.hand.length > 0);
        if (activePlayersWithCards.length <= 1) {
          // Game ended
          break;
        }

        const player = players[currentTurnIdx];
        if (player.hand.length === 0) {
          // Advance turn to next active player
          currentTurnIdx = (currentTurnIdx + 1) % numPlayers;
          continue;
        }

        // Decide move
        const moveCards = decideBotMove(player.hand, lastPlay, isFirstTurn, rules);

        if (moveCards && moveCards.length > 0) {
          // Validate play
          const validation = validatePlay(moveCards, lastPlay, isFirstTurn, rules);
          expect(validation.valid).toBe(true);

          // Remove cards from hand
          const playedIds = new Set(moveCards.map(c => c.id));
          player.hand = player.hand.filter(c => !playedIds.has(c.id));
          player.cardCount = player.hand.length;

          lastPlay = {
            playerId: player.id,
            playerName: player.name,
            combo: validation.combo!,
            timestamp: Date.now()
          };

          isFirstTurn = false;
          consecutivePasses = 0;

          if (player.hand.length === 0) {
            player.finishRank = finishRankCounter++;
          }
        } else {
          // Pass
          expect(isFirstTurn).toBe(false);
          consecutivePasses++;

          // If all other active players have passed, table is cleared
          const remainingWithCards = players.filter(p => p.hand.length > 0);
          if (consecutivePasses >= remainingWithCards.length - 1) {
            lastPlay = null;
            consecutivePasses = 0;
          }
        }

        currentTurnIdx = (currentTurnIdx + 1) % numPlayers;
      }

      // Check assertions
      expect(turnsCount).toBeLessThan(maxTurns);
      const finished = players.filter(p => p.finishRank !== undefined);
      expect(finished.length).toBeGreaterThanOrEqual(numPlayers - 1);
      const winner = players.find(p => p.finishRank === 1);
      expect(winner).toBeDefined();
      expect(winner?.hand.length).toBe(0);
    };

    it('simulates 5-player game with DEFAULT_RULES', () => {
      simulateGame(5, DEFAULT_RULES);
    });

    it('simulates 6-player game with POKER_JAWA_RULES (1 deck / 52 cards)', () => {
      simulateGame(6, POKER_JAWA_RULES);
    });

    it('simulates 8-player game with POKER_JAWA_RULES (1 deck / 52 cards)', () => {
      simulateGame(8, POKER_JAWA_RULES);
    });

    it('simulates 10-player game with POKER_JAWA_RULES (1 deck / 52 cards)', () => {
      simulateGame(10, POKER_JAWA_RULES);
    });
  });
});
