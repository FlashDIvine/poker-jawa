import { describe, it, expect, vi } from 'vitest';
import { Room } from '../src/server/roomManager.js';
import { DEFAULT_RULES, POKER_JAWA_RULES, Card } from '../src/shared/types.js';
import { canBeat, evaluateCombo } from '../src/shared/engine.js';

function makeCard(rank: number, suit: 'S' | 'C' | 'D' | 'H'): Card {
  const suitMap = {
    S: { value: 1, symbol: '♠', name: 'Waru', color: 'black' as const },
    C: { value: 2, symbol: '♣', name: 'Keriting', color: 'black' as const },
    D: { value: 3, symbol: '♦', name: 'Wajik', color: 'red' as const },
    H: { value: 4, symbol: '♥', name: 'Hati', color: 'red' as const }
  };
  const rankLabels: Record<number, string> = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'As', 15: '2'
  };

  return {
    id: `${rankLabels[rank]}${suit}`,
    rank,
    suit,
    suitValue: suitMap[suit].value,
    rankLabel: rankLabels[rank],
    suitSymbol: suitMap[suit].symbol,
    suitName: suitMap[suit].name,
    color: suitMap[suit].color,
    isPoker: rank === 15,
    isAce: rank === 14,
    isThreeSpades: rank === 3 && suit === 'S'
  };
}

describe('Engine & Room Rules: Kena BONG Langsung Mati (pokerCutByBongLoses)', () => {
  describe('Engine canBeat validation for BONG counter', () => {
    it('Single 2 can be cut by Bong Four and Bong SF', () => {
      const single2 = evaluateCombo([makeCard(15, 'H')])!;
      const bongFours = evaluateCombo([
        makeCard(9, 'S'), makeCard(9, 'C'), makeCard(9, 'D'), makeCard(9, 'H')
      ])!;
      const bongSF = evaluateCombo([
        makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S'), makeCard(8, 'S')
      ])!;

      expect(canBeat(single2, bongFours)).toBe(true);
      expect(canBeat(single2, bongSF)).toBe(true);
    });

    it('Pair 2 can be cut by BONG under Poker Jawa rules or when pairAbsoluteRule is false', () => {
      const pair2 = evaluateCombo([makeCard(15, 'S'), makeCard(15, 'H')], POKER_JAWA_RULES)!;
      const bongFours = evaluateCombo([
        makeCard(9, 'S'), makeCard(9, 'C'), makeCard(9, 'D'), makeCard(9, 'H')
      ], POKER_JAWA_RULES)!;
      const straightFlush5 = evaluateCombo([
        makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S'), makeCard(8, 'S'), makeCard(9, 'S')
      ], POKER_JAWA_RULES)!;

      expect(canBeat(pair2, bongFours, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(pair2, straightFlush5, POKER_JAWA_RULES)).toBe(true);
    });
  });

  describe('Room Integration Flow: pokerCutByBongLoses', () => {
    function createMockIo(mockEmits: Record<string, any[]>) {
      return {
        to: () => ({
          emit: (event: string, data: any) => {
            if (!mockEmits[event]) mockEmits[event] = [];
            mockEmits[event].push(data);
          }
        }),
        emit: (event: string, data: any) => {
          if (!mockEmits[event]) mockEmits[event] = [];
          mockEmits[event].push(data);
        },
        sockets: {
          adapter: {
            rooms: new Map()
          },
          sockets: new Map()
        }
      } as any;
    }

    it('Test case 1: Pemain buang 2 satuan -> dipotong BONG -> trigger game over & pemain langsung kalah', () => {
      const mockEmits: Record<string, any[]> = {};
      const mockIo = createMockIo(mockEmits);

      const room = new Room('RM_TEST1', 'Meja Test 1', mockIo, {
        maxPlayers: 4,
        rules: { ...DEFAULT_RULES, pokerCutByBongLoses: true }
      });

      // Setup 4 players
      room.addPlayer('pA', 'Pemain A', '🤠');
      room.addPlayer('pB', 'Pemain B', '😎');
      room.addPlayer('pC', 'Pemain C', '🦊');
      room.addPlayer('pD', 'Pemain D', '🦁');

      room.state.status = 'playing';
      room.state.isFirstTurnOfGame = false;
      room.state.lastPlay = null;

      // Pemain A has Single 2 ('2H') and other cards
      const playerA = room.getPlayer('pA')!;
      playerA.hand = [makeCard(15, 'H'), makeCard(4, 'S'), makeCard(5, 'S')];
      playerA.cardCount = playerA.hand.length;

      // Pemain B has BONG Four of Tens
      const playerB = room.getPlayer('pB')!;
      playerB.hand = [
        makeCard(10, 'S'), makeCard(10, 'C'), makeCard(10, 'D'), makeCard(10, 'H'),
        makeCard(6, 'C')
      ];
      playerB.cardCount = playerB.hand.length;

      // Pemain C & D have cards
      const playerC = room.getPlayer('pC')!;
      playerC.hand = [makeCard(7, 'S'), makeCard(8, 'S')];
      playerC.cardCount = playerC.hand.length;

      const playerD = room.getPlayer('pD')!;
      playerD.hand = [makeCard(9, 'S'), makeCard(9, 'H'), makeCard(9, 'D')];
      playerD.cardCount = playerD.hand.length;

      // 1. Pemain A mengeluarkan Single 2 ('2H')
      room.state.currentTurnPlayerId = 'pA';
      const playA = room.playCards('pA', ['2H']);
      expect(playA.success).toBe(true);
      expect(room.state.status).toBe('playing');
      expect(room.state.lastPlay?.playerId).toBe('pA');
      expect(room.state.lastPlay?.combo.mainRank).toBe(15);
      expect(room.state.lastPlay?.combo.type).toBe('SINGLE');

      // 2. Pemain B memotong dengan BONG Four of Tens ('10S', '10C', '10D', '10H')
      room.state.currentTurnPlayerId = 'pB';
      const playB = room.playCards('pB', ['10S', '10C', '10D', '10H']);
      expect(playB.success).toBe(true);

      // KONSEKUENSI:
      // a. Game Over seketika (Instant Game Over)!
      expect(room.state.status).toBe('game_over');

      // b. Pemain A langsung dinyatakan KALAH TELAK / juru kunci (rank 4)!
      expect(playerA.finishRank).toBe(4);

      // c. Pemain B (bomber) diprioritaskan sebagai pemenang (rank 1)!
      expect(room.state.winnerId).toBe('pB');
      expect(playerB.finishRank).toBe(1);

      // d. Event poker_bong_instant_loss dipancarkan ke socket
      expect(mockEmits['poker_bong_instant_loss']).toBeDefined();
      expect(mockEmits['poker_bong_instant_loss'][0]).toEqual({
        victimPlayerId: 'pA',
        victimName: 'Pemain A',
        bomberPlayerId: 'pB',
        bomberName: 'Pemain B',
        bongType: 'BONG_FOUR',
        bongDescription: 'Bong 4 of a Kind (10)'
      });

      // e. Hasil game results mencatat denda lipat ganda pada Pemain A
      const resultA = room.state.results?.find(r => r.playerId === 'pA');
      expect(resultA).toBeDefined();
      expect(resultA?.rank).toBe(4);
      expect(resultA?.caughtHoldingPoker).toBe(true);
      expect(resultA?.lostByBongCut).toBe(true);
      expect(resultA?.scoreDelta).toBeLessThan(0);

      // f. Pemain B mendapat skor menang (+30)
      const resultB = room.state.results?.find(r => r.playerId === 'pB');
      expect(resultB?.rank).toBe(1);
      expect(resultB?.scoreDelta).toBe(30);
    });

    it('Test case 2: Pemain buang pair 2 -> dipotong BONG -> trigger game over', () => {
      const mockEmits: Record<string, any[]> = {};
      const mockIo = createMockIo(mockEmits);

      const room = new Room('RM_TEST2', 'Meja Test 2', mockIo, {
        maxPlayers: 4,
        rules: { ...POKER_JAWA_RULES, pokerCutByBongLoses: true }
      });

      room.addPlayer('pA', 'Pemain A', '🤠');
      room.addPlayer('pB', 'Pemain B', '😎');
      room.addPlayer('pC', 'Pemain C', '🦊');
      room.addPlayer('pD', 'Pemain D', '🦁');

      room.state.status = 'playing';
      room.state.isFirstTurnOfGame = false;
      room.state.lastPlay = null;

      const playerA = room.getPlayer('pA')!;
      playerA.hand = [makeCard(15, 'S'), makeCard(15, 'H'), makeCard(4, 'S')];
      playerA.cardCount = playerA.hand.length;

      // Pemain B has 5-card Straight Flush (Flush in Poker Jawa)
      const playerB = room.getPlayer('pB')!;
      playerB.hand = [
        makeCard(5, 'C'), makeCard(6, 'C'), makeCard(7, 'C'), makeCard(8, 'C'), makeCard(9, 'C')
      ];
      playerB.cardCount = playerB.hand.length;

      const playerC = room.getPlayer('pC')!;
      playerC.hand = [makeCard(7, 'S'), makeCard(8, 'S')];
      playerC.cardCount = playerC.hand.length;

      const playerD = room.getPlayer('pD')!;
      playerD.hand = [makeCard(9, 'S'), makeCard(9, 'H'), makeCard(9, 'D')];
      playerD.cardCount = playerD.hand.length;

      // 1. Pemain A buang Pair 2 ('2S', '2H')
      room.state.currentTurnPlayerId = 'pA';
      const playA = room.playCards('pA', ['2S', '2H']);
      expect(playA.success).toBe(true);
      expect(room.state.lastPlay?.combo.type).toBe('PAIR');
      expect(room.state.lastPlay?.combo.mainRank).toBe(15);

      // 2. Pemain B potong dengan Straight Flush 5 kartu
      room.state.currentTurnPlayerId = 'pB';
      const playB = room.playCards('pB', ['5C', '6C', '7C', '8C', '9C']);
      expect(playB.success).toBe(true);

      // KONSEKUENSI:
      // Ronde langsung selesai & Pemain A kalah instan
      expect(room.state.status).toBe('game_over');
      expect(playerA.finishRank).toBe(4);
      expect(room.state.winnerId).toBe('pB');
      expect(room.state.bongLossInfo?.victimPlayerId).toBe('pA');
      expect(room.state.bongLossInfo?.bomberPlayerId).toBe('pB');
    });

    it('Test case 3: Pemain buang kartu non-2 (misal As atau King) -> dipotong BONG -> permainan tetap lanjut biasa (tidak mati instan)', () => {
      const mockEmits: Record<string, any[]> = {};
      const mockIo = createMockIo(mockEmits);

      // Under Poker Jawa rules, Straight Flush beats any Single (including Ace or King)
      const room = new Room('RM_TEST3', 'Meja Test 3', mockIo, {
        maxPlayers: 4,
        rules: { ...POKER_JAWA_RULES, pokerCutByBongLoses: true }
      });

      room.addPlayer('pA', 'Pemain A', '🤠');
      room.addPlayer('pB', 'Pemain B', '😎');
      room.addPlayer('pC', 'Pemain C', '🦊');
      room.addPlayer('pD', 'Pemain D', '🦁');

      room.state.status = 'playing';
      room.state.isFirstTurnOfGame = false;
      room.state.lastPlay = null;

      // Pemain A has King and Ace
      const playerA = room.getPlayer('pA')!;
      playerA.hand = [makeCard(13, 'S'), makeCard(14, 'S'), makeCard(4, 'S')];
      playerA.cardCount = playerA.hand.length;

      // Pemain B has Straight Flush and another card
      const playerB = room.getPlayer('pB')!;
      playerB.hand = [
        makeCard(5, 'C'), makeCard(6, 'C'), makeCard(7, 'C'), makeCard(8, 'C'), makeCard(9, 'C'),
        makeCard(10, 'D')
      ];
      playerB.cardCount = playerB.hand.length;

      const playerC = room.getPlayer('pC')!;
      playerC.hand = [makeCard(7, 'S'), makeCard(8, 'S')];
      playerC.cardCount = playerC.hand.length;

      const playerD = room.getPlayer('pD')!;
      playerD.hand = [makeCard(9, 'S'), makeCard(9, 'H'), makeCard(9, 'D')];
      playerD.cardCount = playerD.hand.length;

      // 1. Pemain A buang kartu non-2 (King 'KS')
      room.state.currentTurnPlayerId = 'pA';
      const playA = room.playCards('pA', ['KS']);
      expect(playA.success).toBe(true);
      expect(room.state.lastPlay?.combo.mainRank).toBe(13); // King, non-2

      // 2. Pemain B potong dengan BONG (Straight Flush)
      room.state.currentTurnPlayerId = 'pB';
      const playB = room.playCards('pB', ['5C', '6C', '7C', '8C', '9C']);
      expect(playB.success).toBe(true);

      // KONSEKUENSI:
      // Permainan TETAP LANJUT biasa! TIDAK mati instan / bukan game over!
      expect(room.state.status).toBe('playing');
      expect(room.state.lastPlay?.playerId).toBe('pB');
      expect(room.state.bongLossInfo).toBeNull();
      expect(mockEmits['poker_bong_instant_loss']).toBeUndefined();
    });

    it('does NOT trigger instant loss when pokerCutByBongLoses is explicitly false', () => {
      const mockEmits: Record<string, any[]> = {};
      const mockIo = createMockIo(mockEmits);

      const room = new Room('RM_TEST4', 'Meja Test 4', mockIo, {
        maxPlayers: 4,
        rules: { ...DEFAULT_RULES, pokerCutByBongLoses: false }
      });

      room.addPlayer('pA', 'Pemain A', '🤠');
      room.addPlayer('pB', 'Pemain B', '😎');
      room.addPlayer('pC', 'Pemain C', '🦊');
      room.addPlayer('pD', 'Pemain D', '🦁');

      room.state.status = 'playing';
      room.state.isFirstTurnOfGame = false;
      room.state.lastPlay = null;

      const playerA = room.getPlayer('pA')!;
      playerA.hand = [makeCard(15, 'H'), makeCard(4, 'S'), makeCard(5, 'S')];
      playerA.cardCount = playerA.hand.length;

      const playerB = room.getPlayer('pB')!;
      playerB.hand = [
        makeCard(10, 'S'), makeCard(10, 'C'), makeCard(10, 'D'), makeCard(10, 'H'),
        makeCard(6, 'C')
      ];
      playerB.cardCount = playerB.hand.length;

      // P0 plays 2H
      room.state.currentTurnPlayerId = 'pA';
      room.playCards('pA', ['2H']);

      // P1 cuts with Bong
      room.state.currentTurnPlayerId = 'pB';
      const playB = room.playCards('pB', ['10S', '10C', '10D', '10H']);
      expect(playB.success).toBe(true);

      // Because pokerCutByBongLoses is false, game continues normally
      expect(room.state.status).toBe('playing');
      expect(room.state.lastPlay?.playerId).toBe('pB');
    });
  });
});
