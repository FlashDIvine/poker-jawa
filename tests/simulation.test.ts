import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealDeck, findPlayerWithThreeSpades } from '../src/shared/deck.js';
import { decideBotMove } from '../src/shared/bot.js';
import { validatePlay, evaluateCombo } from '../src/shared/engine.js';
import { PlayedTrick } from '../src/shared/types.js';

describe('End-to-End Game Simulation', () => {
  it('successfully simulates 30 full 4-player games without deadlocks or rule violations', () => {
    const NUM_GAMES = 30;

    for (let g = 0; g < NUM_GAMES; g++) {
      const deck = shuffleDeck(createDeck());
      const hands = dealDeck(deck);

      let currentTurn = findPlayerWithThreeSpades(hands);
      expect(currentTurn).toBeGreaterThanOrEqual(0);
      expect(currentTurn).toBeLessThan(4);

      let isFirstTurnOfGame = true;
      let lastPlay: PlayedTrick | null = null;
      let consecutivePasses = 0;
      let winner = -1;
      let turnCount = 0;
      const MAX_TURNS = 300;

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

          consecutivePasses = 0;
          isFirstTurnOfGame = false;

          // Check for win
          if (hands[currentTurn].length === 0) {
            winner = currentTurn;
            break;
          }
        } else {
          // Bot chose to pass (Lewat)
          expect(isFirstTurnOfGame, 'Opening player cannot pass on first turn').toBe(false);
          consecutivePasses++;

          // If all 3 opponents passed, the last player who played gets a new lead
          if (consecutivePasses === 3) {
            lastPlay = null;
            consecutivePasses = 0;
            // The turn automatically stays or goes to trick winner
            // In standard play, the last player who played leads next
            // That player will be next if we proceed clockwise:
            // Since there were 3 passes, the next player IS the trick winner!
          }
        }

        // Clockwise turn order: (currentTurn + 1) % 4
        currentTurn = (currentTurn + 1) % 4;
      }

      expect(winner, `Game ${g} did not complete within ${MAX_TURNS} turns`).toBeGreaterThanOrEqual(0);
      expect(hands[winner].length).toBe(0);
    }
  });
});
