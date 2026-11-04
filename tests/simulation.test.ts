import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealDeck, findPlayerWithThreeSpades } from '../src/shared/deck.js';
import { decideBotMove } from '../src/shared/bot.js';
import { validatePlay, evaluateCombo } from '../src/shared/engine.js';
import { PlayedTrick } from '../src/shared/types.js';
import { Room } from '../src/server/roomManager.js';

describe('End-to-End Game Simulation', () => {
  it('successfully simulates 30 full 4-player games with accurate pass skipping and trick lifecycle', () => {
    const NUM_GAMES = 30;

    for (let g = 0; g < NUM_GAMES; g++) {
      const deck = shuffleDeck(createDeck());
      const hands = dealDeck(deck);

      let currentTurn = findPlayerWithThreeSpades(hands);
      expect(currentTurn).toBeGreaterThanOrEqual(0);
      expect(currentTurn).toBeLessThan(4);

      let isFirstTurnOfGame = true;
      let lastPlay: PlayedTrick | null = null;
      let leadPlayer = currentTurn;
      const passed = [false, false, false, false];
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

          leadPlayer = currentTurn;
          passed[currentTurn] = false;
          isFirstTurnOfGame = false;

          // Check for win
          if (hands[currentTurn].length === 0) {
            winner = currentTurn;
            break;
          }

          // Check if all other players had already passed earlier in this trick
          const activeOpponents = [0, 1, 2, 3].filter(idx => idx !== currentTurn && !passed[idx]);
          if (activeOpponents.length === 0) {
            lastPlay = null;
            for (let i = 0; i < 4; i++) passed[i] = false;
            // Current player retains lead
            continue;
          }

          // Advance to next active player
          let next = (currentTurn + 1) % 4;
          while (passed[next]) {
            next = (next + 1) % 4;
          }
          currentTurn = next;
        } else {
          // Player chose to pass (Lewat)
          expect(isFirstTurnOfGame, 'Opening player cannot pass on first turn').toBe(false);
          passed[currentTurn] = true;

          const passedCount = passed.filter(p => p).length;
          if (passedCount >= 3) {
            // Trick over! Lead player gets a clean table
            lastPlay = null;
            for (let i = 0; i < 4; i++) passed[i] = false;
            currentTurn = leadPlayer;
          } else {
            // Advance to next active player
            let next = (currentTurn + 1) % 4;
            while (passed[next]) {
              next = (next + 1) % 4;
            }
            currentTurn = next;
          }
        }
      }

      expect(winner, `Game ${g} did not complete within ${MAX_TURNS} turns`).toBeGreaterThanOrEqual(0);
      expect(hands[winner].length).toBe(0);
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
