import { describe, it, expect } from 'vitest';
import { findAllPossibleCombos, decideBotMove } from '../src/shared/bot.js';
import { Card, POKER_JAWA_RULES } from '../src/shared/types.js';
import { evaluateCombo } from '../src/shared/engine.js';

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

describe('Bot logic', () => {
  it('detects all combinations in hand', () => {
    const hand = [
      makeCard(3, 'S'),
      makeCard(3, 'H'),
      makeCard(5, 'S'),
      makeCard(5, 'C'),
      makeCard(5, 'D'),
      makeCard(14, 'S'),
      makeCard(15, 'H')
    ];

    const combos = findAllPossibleCombos(hand);
    expect(combos.length).toBeGreaterThan(0);

    // Should include 3S
    expect(combos.some(c => c.type === 'SINGLE' && c.cards[0].isThreeSpades)).toBe(true);

    // Should include pair of 3s
    expect(combos.some(c => c.type === 'PAIR' && c.mainRank === 3)).toBe(true);

    // Should include tris of 5s
    expect(combos.some(c => c.type === 'TRIS' && c.mainRank === 5)).toBe(true);

    // Should include Full House (5s over 3s)
    expect(combos.some(c => c.type === 'FULL_HOUSE' && c.mainRank === 5)).toBe(true);
  });

  it('guarantees opening play includes 3 Waru (3♠)', () => {
    const hand = [
      makeCard(3, 'S'),
      makeCard(3, 'C'),
      makeCard(7, 'H'),
      makeCard(15, 'H')
    ];

    const move = decideBotMove(hand, null, true);
    expect(move).not.toBeNull();
    expect(move?.some(c => c.isThreeSpades)).toBe(true);
  });

  it('guarantees opening play discards rank 3 when holding other rank 3 cards without 3♠', () => {
    const hand = [
      makeCard(3, 'D'),
      makeCard(3, 'H'),
      makeCard(7, 'H'),
      makeCard(15, 'H')
    ];

    const move = decideBotMove(hand, null, true);
    expect(move).not.toBeNull();
    expect(move?.some(c => c.rank === 3)).toBe(true);
  });

  it('counters Ace with Full House or Tris or Poker 2', () => {
    const hand = [
      makeCard(5, 'S'), makeCard(5, 'C'), makeCard(5, 'D'),
      makeCard(8, 'S'), makeCard(8, 'H'),
      makeCard(15, 'H')
    ];

    const leadAce = {
      playerId: 'p1',
      playerName: 'Player 1',
      combo: evaluateCombo([makeCard(14, 'S')])!,
      timestamp: Date.now()
    };

    const response = decideBotMove(hand, leadAce, false);
    expect(response).not.toBeNull();
    const evaluated = evaluateCombo(response!);
    expect(evaluated).not.toBeNull();
    // Should counter with either Full House, Tris, or Poker 2
    expect(['FULL_HOUSE', 'TRIS', 'SINGLE']).toContain(evaluated?.type);
    if (evaluated?.type === 'SINGLE') {
      expect(evaluated.mainRank).toBe(15); // Poker
    }
  });

  it('bombs Poker (2) with Bong when available', () => {
    const hand = [
      makeCard(9, 'S'), makeCard(9, 'C'), makeCard(9, 'D'), makeCard(9, 'H'),
      makeCard(4, 'S')
    ];

    const leadPoker = {
      playerId: 'p1',
      playerName: 'Player 1',
      combo: evaluateCombo([makeCard(15, 'H')])!,
      timestamp: Date.now()
    };

    const response = decideBotMove(hand, leadPoker, false);
    expect(response).not.toBeNull();
    const evaluated = evaluateCombo(response!);
    expect(evaluated?.type).toBe('BONG_FOUR');
  });

  it('counters Poker (2) with Tris when holding Tris without Bong', () => {
    const hand = [
      makeCard(7, 'S'), makeCard(7, 'C'), makeCard(7, 'D'),
      makeCard(4, 'S')
    ];

    const leadPoker = {
      playerId: 'p1',
      playerName: 'Player 1',
      combo: evaluateCombo([makeCard(15, 'H')])!,
      timestamp: Date.now()
    };

    const response = decideBotMove(hand, leadPoker, false);
    expect(response).not.toBeNull();
    const evaluated = evaluateCombo(response!);
    expect(evaluated?.type).toBe('TRIS');
  });

  it('prefers leading Tris of 3s over Pair on first turn', () => {
    const hand = [
      makeCard(3, 'S'), makeCard(3, 'C'), makeCard(3, 'D'),
      makeCard(8, 'H'), makeCard(9, 'H')
    ];

    const move = decideBotMove(hand, null, true);
    expect(move).not.toBeNull();
    expect(move).toHaveLength(3);
    const evaluated = evaluateCombo(move!);
    expect(evaluated?.type).toBe('TRIS');
  });

  it('dumps entire hand of Tris (including Tris of 2s) on a free lead', () => {
    const hand = [
      makeCard(15, 'S'), makeCard(15, 'C'), makeCard(15, 'D')
    ];

    const move = decideBotMove(hand, null, false);
    expect(move).not.toBeNull();
    expect(move).toHaveLength(3);
    const evaluated = evaluateCombo(move!);
    expect(evaluated?.type).toBe('TRIS');
    expect(evaluated?.mainRank).toBe(15);
  });

  it('cannot counter Pair of Aces with Tris (Pair only beatable by higher Pair)', () => {
    const handWithoutHigherPair = [
      makeCard(8, 'S'), makeCard(8, 'C'), makeCard(8, 'D'), // Tris
      makeCard(4, 'S')
    ];

    const leadPairAs = {
      playerId: 'p1',
      playerName: 'Player 1',
      combo: evaluateCombo([makeCard(14, 'S'), makeCard(14, 'H')])!,
      timestamp: Date.now()
    };

    // Tris cannot counter Pair of Aces -> bot must pass (return null)
    const response1 = decideBotMove(handWithoutHigherPair, leadPairAs, false);
    expect(response1).toBeNull();

    // With Pair of Poker (2), bot can counter Pair of Aces
    const handWithPairPoker = [
      makeCard(15, 'S'), makeCard(15, 'H'),
      makeCard(4, 'S')
    ];
    const response2 = decideBotMove(handWithPairPoker, leadPairAs, false);
    expect(response2).not.toBeNull();
    const evaluated2 = evaluateCombo(response2!);
    expect(evaluated2?.type).toBe('PAIR');
    expect(evaluated2?.mainRank).toBe(15);
  });

  it('passes when no valid beat exists', () => {
    const hand = [
      makeCard(4, 'S'),
      makeCard(5, 'S')
    ];

    const leadKing = {
      playerId: 'p1',
      playerName: 'Player 1',
      combo: evaluateCombo([makeCard(13, 'H')])!,
      timestamp: Date.now()
    };

    const response = decideBotMove(hand, leadKing, false);
    expect(response).toBeNull();
  });

  it('detects low straight A-2-3-4-5 in hand even with other non-consecutive cards', () => {
    // Hand has 3S, 4D, 5C, 8H, 10S, As(14H), 2(15S)
    const hand = [
      makeCard(3, 'S'),
      makeCard(4, 'D'),
      makeCard(5, 'C'),
      makeCard(8, 'H'),
      makeCard(10, 'S'),
      makeCard(14, 'H'),
      makeCard(15, 'S')
    ];

    const combos = findAllPossibleCombos(hand, POKER_JAWA_RULES);
    const lowStraight = combos.find(c => c.type === 'STRAIGHT' && c.mainRank === 5);
    expect(lowStraight).toBeDefined();
    expect(lowStraight?.cards).toHaveLength(5);
  });

  it('detects brother 2-3 in hand under Poker Jawa rules', () => {
    // Hand has pair of 2s and pair of 3s plus other cards
    const hand = [
      makeCard(3, 'S'), makeCard(3, 'C'),
      makeCard(15, 'H'), makeCard(15, 'D'),
      makeCard(7, 'S')
    ];

    const combos = findAllPossibleCombos(hand, POKER_JAWA_RULES);
    const brother23 = combos.find(c => c.type === 'BROTHER' && c.mainRank === 3);
    expect(brother23).toBeDefined();
    expect(brother23?.cards).toHaveLength(4);
  });
});
