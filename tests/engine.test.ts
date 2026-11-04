import { describe, it, expect } from 'vitest';
import { evaluateCombo, canBeat, validatePlay } from '../src/shared/engine.js';
import { Card, DEFAULT_RULES } from '../src/shared/types.js';

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

  it('cards of same rank cannot beat each other (ga boleh tabrak kartu yang sama, misal 8 tidak boleh ditabrak 8)', () => {
    const eightSpades = evaluateCombo([makeCard(8, 'S')])!;
    const eightHearts = evaluateCombo([makeCard(8, 'H')])!;
    const nineSpades = evaluateCombo([makeCard(9, 'S')])!;

    // 8 cannot be beaten by 8
    expect(canBeat(eightSpades, eightHearts)).toBe(false);
    expect(canBeat(eightHearts, eightSpades)).toBe(false);
    // Higher rank (9) beats 8
    expect(canBeat(eightSpades, nineSpades)).toBe(true);

    // Ace cannot be beaten by Ace
    const asSpades = evaluateCombo([makeCard(14, 'S')])!;
    const asHearts = evaluateCombo([makeCard(14, 'H')])!;
    expect(canBeat(asSpades, asHearts)).toBe(false);

    // Pairs of same rank cannot beat each other
    const pairEight1 = evaluateCombo([makeCard(8, 'S'), makeCard(8, 'C')])!;
    const pairEight2 = evaluateCombo([makeCard(8, 'D'), makeCard(8, 'H')])!;
    const pairNine = evaluateCombo([makeCard(9, 'S'), makeCard(9, 'C')])!;
    expect(canBeat(pairEight1, pairEight2)).toBe(false);
    expect(canBeat(pairEight1, pairNine)).toBe(true);
  });

  it('Poker (2) is highest single and beats any Ace or lower card, but 2 cannot beat 2', () => {
    const asHearts = evaluateCombo([makeCard(14, 'H')])!;
    const pokerSpades = evaluateCombo([makeCard(15, 'S')])!;
    const pokerHearts = evaluateCombo([makeCard(15, 'H')])!;

    expect(canBeat(asHearts, pokerSpades)).toBe(true);
    // 2 cannot beat 2 (ga boleh tabrak kartu yang sama)
    expect(canBeat(pokerSpades, pokerHearts)).toBe(false);
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

    // Poker (2) can also be countered by Tris (kembar 3) or Full House!
    const trisSevens = evaluateCombo([makeCard(7, 'S'), makeCard(7, 'C'), makeCard(7, 'D')])!;
    const fullHouseThrees = evaluateCombo([
      makeCard(3, 'S'), makeCard(3, 'C'), makeCard(3, 'D'),
      makeCard(4, 'S'), makeCard(4, 'C')
    ])!;
    expect(canBeat(pokerHearts, trisSevens)).toBe(true);
    expect(canBeat(pokerHearts, fullHouseThrees)).toBe(true);

    // Aturan Mutlak Pair: Pair (2 kartu kembar) HANYA boleh ditabrak oleh Pair juga!
    const pairPoker = evaluateCombo([makeCard(15, 'S'), makeCard(15, 'H')])!;
    const pairAces = evaluateCombo([makeCard(14, 'S'), makeCard(14, 'H')])!;

    // Tris, Full House, atau Bong TIDAK BISA menabrak Pair!
    expect(canBeat(pairPoker, trisSevens)).toBe(false);
    expect(canBeat(pairPoker, fullHouseThrees)).toBe(false);
    expect(canBeat(pairPoker, bongFours)).toBe(false);

    expect(canBeat(pairAces, trisSevens)).toBe(false);
    expect(canBeat(pairAces, fullHouseThrees)).toBe(false);
    expect(canBeat(pairAces, bongFours)).toBe(false);

    // Pair hanya boleh ditabrak oleh Pair yang lebih tinggi
    expect(canBeat(pairAces, pairPoker)).toBe(true);

    // Normal single (e.g. Jack) cannot be beaten by Bong or Tris
    const jackHearts = evaluateCombo([makeCard(11, 'H')])!;
    expect(canBeat(jackHearts, bongFours)).toBe(false);
    expect(canBeat(jackHearts, trisSevens)).toBe(false);
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

    // Bong SF of same rank cannot beat each other (tidak boleh tabrak angka sama)
    const bongSFSpades = evaluateCombo([
      makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S'), makeCard(8, 'S')
    ])!;
    const bongSFHearts = evaluateCombo([
      makeCard(5, 'H'), makeCard(6, 'H'), makeCard(7, 'H'), makeCard(8, 'H')
    ])!;
    expect(canBeat(bongSFSpades, bongSFHearts)).toBe(false);
    expect(canBeat(bongSFHearts, bongSFSpades)).toBe(false);
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

  it('Bong cannot counter Ace, Tris, or Full House (Bong only counters Poker 2 or lower Bong)', () => {
    const asHearts = evaluateCombo([makeCard(14, 'H')])!;
    const trisNines = evaluateCombo([makeCard(9, 'S'), makeCard(9, 'C'), makeCard(9, 'D')])!;
    const fullHouseFives = evaluateCombo([
      makeCard(5, 'S'), makeCard(5, 'C'), makeCard(5, 'D'),
      makeCard(3, 'S'), makeCard(3, 'C')
    ])!;
    const bongTens = evaluateCombo([
      makeCard(10, 'S'), makeCard(10, 'C'), makeCard(10, 'D'), makeCard(10, 'H')
    ])!;
    const bongSF = evaluateCombo([
      makeCard(7, 'S'), makeCard(8, 'S'), makeCard(9, 'S'), makeCard(10, 'S')
    ])!;

    // Bong cannot cut Ace (only higher Ace, Poker 2, Tris, or Full House can cut Ace)
    expect(canBeat(asHearts, bongTens)).toBe(false);
    expect(canBeat(asHearts, bongSF)).toBe(false);

    // Bong cannot bomb Tris (only higher Tris can beat Tris)
    expect(canBeat(trisNines, bongTens)).toBe(false);
    expect(canBeat(trisNines, bongSF)).toBe(false);

    // Bong cannot bomb Full House (only higher Full House can beat Full House)
    expect(canBeat(fullHouseFives, bongTens)).toBe(false);
    expect(canBeat(fullHouseFives, bongSF)).toBe(false);
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

    const fourSpades = [makeCard(4, 'S')];
    const invalidFour = validatePlay(fourSpades, null, true);
    expect(invalidFour.valid).toBe(false);
    expect(invalidFour.error).toContain('3 Waru (3♠)');
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

    // Playing 5H cannot beat 5S (tidak boleh tabrak angka sama)
    const invalidSame = validatePlay([makeCard(5, 'H')], play1, false);
    expect(invalidSame.valid).toBe(false);
  });

  it('comprehensive edge cases: same rank never beats same rank across all ranks', () => {
    // Check all ranks 3 to 15
    for (let r = 3; r <= 15; r++) {
      const spade = evaluateCombo([makeCard(r, 'S')])!;
      const heart = evaluateCombo([makeCard(r, 'H')])!;
      expect(canBeat(spade, heart)).toBe(false);
      expect(canBeat(heart, spade)).toBe(false);

      const pair1 = evaluateCombo([makeCard(r, 'S'), makeCard(r, 'C')])!;
      const pair2 = evaluateCombo([makeCard(r, 'D'), makeCard(r, 'H')])!;
      expect(canBeat(pair1, pair2)).toBe(false);
      expect(canBeat(pair2, pair1)).toBe(false);
    }
  });

  it('opening turn allows any combo containing rank 3 when configured for any_3', () => {
    const rulesAny3 = { ...DEFAULT_RULES, openingCard: 'any_3' as const };
    const single3D = [makeCard(3, 'D')];
    expect(validatePlay(single3D, null, true, rulesAny3).valid).toBe(true);

    const tris3 = [makeCard(3, 'S'), makeCard(3, 'C'), makeCard(3, 'D')];
    expect(validatePlay(tris3, null, true, rulesAny3).valid).toBe(true);

    const fh3Over4 = [
      makeCard(3, 'S'), makeCard(3, 'C'), makeCard(3, 'D'),
      makeCard(4, 'S'), makeCard(4, 'H')
    ];
    expect(validatePlay(fh3Over4, null, true, rulesAny3).valid).toBe(true);

    const fh4Over3 = [
      makeCard(4, 'S'), makeCard(4, 'C'), makeCard(4, 'D'),
      makeCard(3, 'S'), makeCard(3, 'H')
    ];
    expect(validatePlay(fh4Over3, null, true, rulesAny3).valid).toBe(true);

    const kingSingle = [makeCard(13, 'H')];
    expect(validatePlay(kingSingle, null, true, rulesAny3).valid).toBe(false);
  });
});
