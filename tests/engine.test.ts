import { describe, it, expect } from 'vitest';
import { evaluateCombo, canBeat, validatePlay } from '../src/shared/engine.js';
import { Card } from '../src/shared/types.js';

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

describe('Engine - evaluateCombo', () => {
  it('evaluates Single correctly', () => {
    const single = evaluateCombo([makeCard(3, 'S')]);
    expect(single).not.toBeNull();
    expect(single?.type).toBe('SINGLE');
    expect(single?.mainRank).toBe(3);
    expect(single?.highestSuitValue).toBe(1);

    const poker = evaluateCombo([makeCard(15, 'H')]);
    expect(poker?.type).toBe('SINGLE');
    expect(poker?.mainRank).toBe(15);
    expect(poker?.description).toContain('Poker');

    const ace = evaluateCombo([makeCard(14, 'D')]);
    expect(ace?.type).toBe('SINGLE');
    expect(ace?.mainRank).toBe(14);
    expect(ace?.description).toContain('As');
  });

  it('evaluates Pair correctly', () => {
    const pair = evaluateCombo([makeCard(7, 'S'), makeCard(7, 'H')]);
    expect(pair?.type).toBe('PAIR');
    expect(pair?.mainRank).toBe(7);
    expect(pair?.highestSuitValue).toBe(4);

    const invalidPair = evaluateCombo([makeCard(7, 'S'), makeCard(8, 'H')]);
    expect(invalidPair).toBeNull();
  });

  it('evaluates Tris (Three of a Kind) correctly', () => {
    const tris = evaluateCombo([makeCard(9, 'S'), makeCard(9, 'C'), makeCard(9, 'H')]);
    expect(tris?.type).toBe('TRIS');
    expect(tris?.mainRank).toBe(9);

    const invalidTris = evaluateCombo([makeCard(9, 'S'), makeCard(9, 'C'), makeCard(10, 'H')]);
    expect(invalidTris).toBeNull();
  });

  it('evaluates Bong (Four of a Kind) correctly', () => {
    const fourOfAKind = evaluateCombo([
      makeCard(10, 'S'), makeCard(10, 'C'), makeCard(10, 'D'), makeCard(10, 'H')
    ]);
    expect(fourOfAKind?.type).toBe('BONG_FOUR');
    expect(fourOfAKind?.mainRank).toBe(10);
  });

  it('evaluates Bong (4-card Straight Flush) correctly', () => {
    const straightFlush = evaluateCombo([
      makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S'), makeCard(8, 'S')
    ]);
    expect(straightFlush?.type).toBe('BONG_SF');
    expect(straightFlush?.mainRank).toBe(8);

    // Not same suit -> invalid
    const notSameSuit = evaluateCombo([
      makeCard(5, 'S'), makeCard(6, 'C'), makeCard(7, 'S'), makeCard(8, 'S')
    ]);
    expect(notSameSuit).toBeNull();

    // Not consecutive -> invalid
    const notConsecutive = evaluateCombo([
      makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S'), makeCard(9, 'S')
    ]);
    expect(notConsecutive).toBeNull();
  });

  it('evaluates Full House (5 cards) correctly and rejects other 5-card hands', () => {
    const fullHouse = evaluateCombo([
      makeCard(8, 'S'), makeCard(8, 'C'), makeCard(8, 'H'),
      makeCard(4, 'D'), makeCard(4, 'H')
    ]);
    expect(fullHouse?.type).toBe('FULL_HOUSE');
    expect(fullHouse?.mainRank).toBe(8); // Triplet rank

    // Regular flush or straight or two pair + kicker must be rejected
    const regularFlush = evaluateCombo([
      makeCard(3, 'H'), makeCard(5, 'H'), makeCard(7, 'H'), makeCard(9, 'H'), makeCard(11, 'H')
    ]);
    expect(regularFlush).toBeNull(); // Only Full House allowed for 5 cards
  });
});

describe('Engine - canBeat rules', () => {
  it('higher single beats lower single', () => {
    const threeSpades = evaluateCombo([makeCard(3, 'S')])!;
    const fourSpades = evaluateCombo([makeCard(4, 'S')])!;
    expect(canBeat(threeSpades, fourSpades)).toBe(true);
    expect(canBeat(fourSpades, threeSpades)).toBe(false);
  });

  it('same rank single is decided by suit: Waru (S) < Keriting (C) < Wajik (D) < Hati (H)', () => {
    const asSpades = evaluateCombo([makeCard(14, 'S')])!;
    const asClubs = evaluateCombo([makeCard(14, 'C')])!;
    const asDiamonds = evaluateCombo([makeCard(14, 'D')])!;
    const asHearts = evaluateCombo([makeCard(14, 'H')])!;

    expect(canBeat(asSpades, asClubs)).toBe(true);
    expect(canBeat(asClubs, asDiamonds)).toBe(true);
    expect(canBeat(asDiamonds, asHearts)).toBe(true);
    expect(canBeat(asHearts, asDiamonds)).toBe(false);
  });

  it('Poker (2) is highest single and beats any Ace or lower card', () => {
    const asHearts = evaluateCombo([makeCard(14, 'H')])!;
    const pokerSpades = evaluateCombo([makeCard(15, 'S')])!;
    const pokerHearts = evaluateCombo([makeCard(15, 'H')])!;

    expect(canBeat(asHearts, pokerSpades)).toBe(true);
    expect(canBeat(pokerSpades, pokerHearts)).toBe(true);
    expect(canBeat(pokerHearts, pokerSpades)).toBe(false);
  });

  it('Ace counter rules: Ace can be cut by Poker (2), Tris, or Full House', () => {
    const asSpades = evaluateCombo([makeCard(14, 'S')])!;
    const pokerSpades = evaluateCombo([makeCard(15, 'S')])!;
    const trisThrees = evaluateCombo([makeCard(3, 'S'), makeCard(3, 'C'), makeCard(3, 'H')])!;
    const fullHouseFours = evaluateCombo([
      makeCard(4, 'S'), makeCard(4, 'C'), makeCard(4, 'H'),
      makeCard(3, 'D'), makeCard(3, 'H')
    ])!;

    expect(canBeat(asSpades, pokerSpades)).toBe(true);
    expect(canBeat(asSpades, trisThrees)).toBe(true);
    expect(canBeat(asSpades, fullHouseFours)).toBe(true);

    // Normal non-ace single (e.g. King) CANNOT be cut by Tris or Full House
    const kingHearts = evaluateCombo([makeCard(13, 'H')])!;
    expect(canBeat(kingHearts, trisThrees)).toBe(false);
    expect(canBeat(kingHearts, fullHouseFours)).toBe(false);
  });

  it('Poker counter rules: Poker (2) can be bombed by Bong (4 of a Kind or Straight Flush)', () => {
    const pokerHearts = evaluateCombo([makeCard(15, 'H')])!;
    const bongFours = evaluateCombo([
      makeCard(6, 'S'), makeCard(6, 'C'), makeCard(6, 'D'), makeCard(6, 'H')
    ])!;
    const bongSF = evaluateCombo([
      makeCard(4, 'H'), makeCard(5, 'H'), makeCard(6, 'H'), makeCard(7, 'H')
    ])!;

    expect(canBeat(pokerHearts, bongFours)).toBe(true);
    expect(canBeat(pokerHearts, bongSF)).toBe(true);

    // Normal single (e.g. Jack) cannot be beaten by Bong unless it is Ace/Poker
    const jackHearts = evaluateCombo([makeCard(11, 'H')])!;
    expect(canBeat(jackHearts, bongFours)).toBe(false);
  });

  it('Bong vs Bong hierarchy: Straight Flush beats 4 of a Kind; higher 4-of-a-kind beats lower', () => {
    const bong7s = evaluateCombo([
      makeCard(7, 'S'), makeCard(7, 'C'), makeCard(7, 'D'), makeCard(7, 'H')
    ])!;
    const bong8s = evaluateCombo([
      makeCard(8, 'S'), makeCard(8, 'C'), makeCard(8, 'D'), makeCard(8, 'H')
    ])!;
    const bongSF = evaluateCombo([
      makeCard(4, 'S'), makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S')
    ])!;

    expect(canBeat(bong7s, bong8s)).toBe(true);
    expect(canBeat(bong8s, bong7s)).toBe(false);
    expect(canBeat(bong8s, bongSF)).toBe(true); // Straight Flush beats 4 of a Kind
  });

  it('Full House vs Full House is decided by the triplet rank', () => {
    const fhSevens = evaluateCombo([
      makeCard(7, 'S'), makeCard(7, 'C'), makeCard(7, 'D'),
      makeCard(15, 'C'), makeCard(15, 'H') // pair of 2s
    ])!;
    const fhEights = evaluateCombo([
      makeCard(8, 'S'), makeCard(8, 'C'), makeCard(8, 'D'),
      makeCard(3, 'C'), makeCard(3, 'H') // pair of 3s
    ])!;

    // 8-8-8-3-3 beats 7-7-7-2-2 because 8 > 7
    expect(canBeat(fhSevens, fhEights)).toBe(true);
    expect(canBeat(fhEights, fhSevens)).toBe(false);
  });
});

describe('Engine - validatePlay & Opening Lead rule', () => {
  it('first turn of game MUST contain 3 Waru (3♠)', () => {
    const threeSpades = [makeCard(3, 'S')];
    const threeHearts = [makeCard(3, 'H')];
    const pairWith3S = [makeCard(3, 'S'), makeCard(3, 'H')];

    expect(validatePlay(threeSpades, null, true).valid).toBe(true);
    expect(validatePlay(pairWith3S, null, true).valid).toBe(true);

    const invalidStart = validatePlay(threeHearts, null, true);
    expect(invalidStart.valid).toBe(false);
    expect(invalidStart.error).toContain('3 Waru (3♠)');
  });

  it('subsequent turns allow valid plays that beat the table', () => {
    const play1 = {
      playerId: 'p1',
      playerName: 'Player 1',
      combo: evaluateCombo([makeCard(5, 'S')])!,
      timestamp: Date.now()
    };

    // Playing 6S beats 5S
    const validHigher = validatePlay([makeCard(6, 'S')], play1, false);
    expect(validHigher.valid).toBe(true);

    // Playing 4S cannot beat 5S
    const invalidLower = validatePlay([makeCard(4, 'S')], play1, false);
    expect(invalidLower.valid).toBe(false);
  });
});
