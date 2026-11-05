import { describe, it, expect } from 'vitest';
import { Card, POKER_JAWA_RULES, DEFAULT_RULES } from '../src/shared/types.js';
import { evaluateCombo, canBeat, validatePlay, getSuitRank } from '../src/shared/engine.js';
import { createDeck } from '../src/shared/deck.js';

const makeCard = (rank: number, suit: 'S' | 'H' | 'C' | 'D', deckIndex = 1): Card => {
  const rankLabels: Record<number, string> = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'As', 15: '2'
  };
  const suitSymbols: Record<string, string> = { S: '♠', H: '♥', C: '♣', D: '♦' };
  const suitNames: Record<string, string> = { S: 'Waru', H: 'Hati', C: 'Keriting', D: 'Wajik' };
  const suitColors: Record<string, 'black' | 'red'> = { S: 'black', H: 'red', C: 'black', D: 'red' };
  const suitValues: Record<string, number> = { S: 1, C: 2, D: 3, H: 4 };

  const id = deckIndex > 1 ? `${rankLabels[rank]}${suit}_${deckIndex}` : `${rankLabels[rank]}${suit}`;
  return {
    id,
    rank,
    rankLabel: rankLabels[rank],
    suit,
    suitSymbol: suitSymbols[suit],
    suitName: suitNames[suit],
    color: suitColors[suit],
    suitValue: suitValues[suit],
    isThreeSpades: rank === 3 && suit === 'S',
    isAce: rank === 14,
    isPoker: rank === 15
  };
};

describe('Poker Jawa Rules & Combinations', () => {
  describe('Suit Hierarchy', () => {
    it('ranks suits correctly: Sekop (4) > Hati (3) > Keriting (2) > Wajik (1)', () => {
      expect(getSuitRank('S')).toBe(4);
      expect(getSuitRank('H')).toBe(3);
      expect(getSuitRank('C')).toBe(2);
      expect(getSuitRank('D')).toBe(1);
    });

    it('allows same rank single beaten by higher suit in Poker Jawa', () => {
      const cardKd = makeCard(13, 'D'); // King Wajik
      const cardKh = makeCard(13, 'H'); // King Hati
      const cardKs = makeCard(13, 'S'); // King Sekop

      const singleKd = evaluateCombo([cardKd], POKER_JAWA_RULES)!;
      const singleKh = evaluateCombo([cardKh], POKER_JAWA_RULES)!;
      const singleKs = evaluateCombo([cardKs], POKER_JAWA_RULES)!;

      // King Hati beats King Wajik
      expect(canBeat(singleKd, singleKh, POKER_JAWA_RULES)).toBe(true);
      // King Sekop beats King Hati
      expect(canBeat(singleKh, singleKs, POKER_JAWA_RULES)).toBe(true);
      // King Wajik cannot beat King Sekop
      expect(canBeat(singleKs, singleKd, POKER_JAWA_RULES)).toBe(false);

      // But in DEFAULT_RULES, same rank single is FORBIDDEN
      expect(canBeat(singleKd, singleKh, DEFAULT_RULES)).toBe(false);
    });

    it('allows same rank pair beaten by higher suit pair in Poker Jawa', () => {
      const pairLow = evaluateCombo([makeCard(8, 'D'), makeCard(8, 'C')], POKER_JAWA_RULES)!;
      const pairHigh = evaluateCombo([makeCard(8, 'H'), makeCard(8, 'S')], POKER_JAWA_RULES)!;

      expect(canBeat(pairLow, pairHigh, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(pairHigh, pairLow, POKER_JAWA_RULES)).toBe(false);

      // In DEFAULT_RULES, same rank pair is forbidden
      expect(canBeat(pairLow, pairHigh, DEFAULT_RULES)).toBe(false);
    });
  });

  describe('Poker Jawa 5-Card Hands (Paket)', () => {
    it('evaluates Straight (Seri)', () => {
      // 4D, 5C, 6H, 7S, 8D
      const cards = [
        makeCard(4, 'D'),
        makeCard(5, 'C'),
        makeCard(6, 'H'),
        makeCard(7, 'S'),
        makeCard(8, 'D')
      ];
      const combo = evaluateCombo(cards, POKER_JAWA_RULES);
      expect(combo).not.toBeNull();
      expect(combo?.type).toBe('STRAIGHT');
      expect(combo?.mainRank).toBe(8);

      // In DEFAULT_RULES, Straight is disabled
      expect(evaluateCombo(cards, DEFAULT_RULES)).toBeNull();
    });

    it('evaluates Flush (Colour / Warna)', () => {
      // 5 cards of Hearts, not straight: 3H, 6H, 8H, 10H, KH
      const cards = [
        makeCard(3, 'H'),
        makeCard(6, 'H'),
        makeCard(8, 'H'),
        makeCard(10, 'H'),
        makeCard(13, 'H')
      ];
      const combo = evaluateCombo(cards, POKER_JAWA_RULES);
      expect(combo).not.toBeNull();
      expect(combo?.type).toBe('FLUSH');
      expect(combo?.suit).toBe('H');
      expect(combo?.mainRank).toBe(13);

      // In DEFAULT_RULES, Flush is disabled
      expect(evaluateCombo(cards, DEFAULT_RULES)).toBeNull();
    });

    it('evaluates Full House (Polo)', () => {
      // 9S, 9H, 9D, 4C, 4H
      const cards = [
        makeCard(9, 'S'),
        makeCard(9, 'H'),
        makeCard(9, 'D'),
        makeCard(4, 'C'),
        makeCard(4, 'H')
      ];
      const combo = evaluateCombo(cards, POKER_JAWA_RULES);
      expect(combo).not.toBeNull();
      expect(combo?.type).toBe('FULL_HOUSE');
      expect(combo?.mainRank).toBe(9);
    });

    it('evaluates Split (Piting: 3-card straight flush + 1 pair)', () => {
      // 5S, 6S, 7S (Color Tris) + 9H, 9D (Pair)
      const cards = [
        makeCard(5, 'S'),
        makeCard(6, 'S'),
        makeCard(7, 'S'),
        makeCard(9, 'H'),
        makeCard(9, 'D')
      ];
      const combo = evaluateCombo(cards, POKER_JAWA_RULES);
      expect(combo).not.toBeNull();
      expect(combo?.type).toBe('SPLIT');
      expect(combo?.mainRank).toBe(7); // highest rank of 3-card sequence
    });

    it('evaluates 5-Card Straight Flush (Flush)', () => {
      // 6S, 7S, 8S, 9S, 10S
      const cards = [
        makeCard(6, 'S'),
        makeCard(7, 'S'),
        makeCard(8, 'S'),
        makeCard(9, 'S'),
        makeCard(10, 'S')
      ];
      const combo = evaluateCombo(cards, POKER_JAWA_RULES);
      expect(combo).not.toBeNull();
      expect(combo?.type).toBe('STRAIGHT_FLUSH');
      expect(combo?.mainRank).toBe(10);
      expect(combo?.suit).toBe('S');
    });

    it('evaluates Royal Straight Flush (Level 6 top)', () => {
      // 10H, JH, QH, KH, AH
      const cards = [
        makeCard(10, 'H'),
        makeCard(11, 'H'),
        makeCard(12, 'H'),
        makeCard(13, 'H'),
        makeCard(14, 'H')
      ];
      const combo = evaluateCombo(cards, POKER_JAWA_RULES);
      expect(combo).not.toBeNull();
      expect(combo?.type).toBe('ROYAL_FLUSH');
      expect(combo?.mainRank).toBe(14);
      expect(combo?.suit).toBe('H');
    });
  });

  describe('Paket Hierarchy in Poker Jawa', () => {
    // Level 1 Straight < Level 2 Colour < Level 3 Full House < Level 4 Split < Level 5 Flush (SF) < Level 6 RSF
    const straight = evaluateCombo([
      makeCard(4, 'D'), makeCard(5, 'C'), makeCard(6, 'H'), makeCard(7, 'S'), makeCard(8, 'D')
    ], POKER_JAWA_RULES)!;

    const colour = evaluateCombo([
      makeCard(3, 'H'), makeCard(5, 'H'), makeCard(8, 'H'), makeCard(10, 'H'), makeCard(12, 'H')
    ], POKER_JAWA_RULES)!;

    const fullHouse = evaluateCombo([
      makeCard(6, 'S'), makeCard(6, 'H'), makeCard(6, 'D'), makeCard(3, 'C'), makeCard(3, 'H')
    ], POKER_JAWA_RULES)!;

    const split = evaluateCombo([
      makeCard(4, 'S'), makeCard(5, 'S'), makeCard(6, 'S'), makeCard(8, 'H'), makeCard(8, 'D')
    ], POKER_JAWA_RULES)!;

    const straightFlush = evaluateCombo([
      makeCard(5, 'C'), makeCard(6, 'C'), makeCard(7, 'C'), makeCard(8, 'C'), makeCard(9, 'C')
    ], POKER_JAWA_RULES)!;

    const royalFlush = evaluateCombo([
      makeCard(10, 'S'), makeCard(11, 'S'), makeCard(12, 'S'), makeCard(13, 'S'), makeCard(14, 'S')
    ], POKER_JAWA_RULES)!;

    it('Level 2 Colour beats Level 1 Straight', () => {
      expect(canBeat(straight, colour, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(colour, straight, POKER_JAWA_RULES)).toBe(false);
    });

    it('Level 3 Full House beats Level 2 Colour', () => {
      expect(canBeat(colour, fullHouse, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(fullHouse, colour, POKER_JAWA_RULES)).toBe(false);
    });

    it('Level 4 Split beats Level 3 Full House', () => {
      expect(canBeat(fullHouse, split, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(split, fullHouse, POKER_JAWA_RULES)).toBe(false);
    });

    it('Level 5 Straight Flush beats Level 4 Split', () => {
      expect(canBeat(split, straightFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(straightFlush, split, POKER_JAWA_RULES)).toBe(false);
    });

    it('Level 6 Royal Flush beats Level 5 Straight Flush', () => {
      expect(canBeat(straightFlush, royalFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(royalFlush, straightFlush, POKER_JAWA_RULES)).toBe(false);
    });
  });

  describe('Special Poker Jawa Combos', () => {
    it('evaluates and compares Brother (2 consecutive pairs - 4 cards)', () => {
      // Brother 6 and 7
      const b67 = evaluateCombo([
        makeCard(6, 'S'), makeCard(6, 'H'),
        makeCard(7, 'C'), makeCard(7, 'D')
      ], POKER_JAWA_RULES)!;
      expect(b67).not.toBeNull();
      expect(b67.type).toBe('BROTHER');
      expect(b67.mainRank).toBe(7);

      // Brother 8 and 9
      const b89 = evaluateCombo([
        makeCard(8, 'S'), makeCard(8, 'H'),
        makeCard(9, 'C'), makeCard(9, 'D')
      ], POKER_JAWA_RULES)!;
      expect(b89).not.toBeNull();
      expect(b89.mainRank).toBe(9);

      // b89 beats b67
      expect(canBeat(b67, b89, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(b89, b67, POKER_JAWA_RULES)).toBe(false);
    });

    it('evaluates and compares Brother Panjang (3 consecutive pairs - 6 cards)', () => {
      const bpLow = evaluateCombo([
        makeCard(4, 'S'), makeCard(4, 'H'),
        makeCard(5, 'C'), makeCard(5, 'D'),
        makeCard(6, 'S'), makeCard(6, 'C')
      ], POKER_JAWA_RULES)!;
      expect(bpLow).not.toBeNull();
      expect(bpLow.type).toBe('BROTHER_PANJANG');
      expect(bpLow.mainRank).toBe(6);

      const bpHigh = evaluateCombo([
        makeCard(7, 'S'), makeCard(7, 'H'),
        makeCard(8, 'C'), makeCard(8, 'D'),
        makeCard(9, 'S'), makeCard(9, 'C')
      ], POKER_JAWA_RULES)!;
      expect(bpHigh.mainRank).toBe(9);

      expect(canBeat(bpLow, bpHigh, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(bpHigh, bpLow, POKER_JAWA_RULES)).toBe(false);
    });

    it('evaluates Color Tris (3 consecutive cards same suit) and beats regular Tris', () => {
      // Color Tris 5S, 6S, 7S
      const colorTris = evaluateCombo([
        makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S')
      ], POKER_JAWA_RULES)!;
      expect(colorTris).not.toBeNull();
      expect(colorTris.type).toBe('COLOR_TRIS');

      // Regular Tris 9S, 9H, 9D
      const regularTris = evaluateCombo([
        makeCard(9, 'S'), makeCard(9, 'H'), makeCard(9, 'D')
      ], POKER_JAWA_RULES)!;
      expect(regularTris.type).toBe('TRIS');

      // Color Tris beats regular Tris!
      expect(canBeat(regularTris, colorTris, POKER_JAWA_RULES)).toBe(true);
    });
  });

  describe('Poker Jawa Bombs & Cuts', () => {
    it('4 of a Kind bombs Single 2', () => {
      const single2 = evaluateCombo([makeCard(15, 'S')], POKER_JAWA_RULES)!;
      const fourOfAKind = evaluateCombo([
        makeCard(10, 'S'), makeCard(10, 'H'), makeCard(10, 'C'), makeCard(10, 'D')
      ], POKER_JAWA_RULES)!;

      expect(canBeat(single2, fourOfAKind, POKER_JAWA_RULES)).toBe(true);
    });

    it('5-card Straight Flush bombs Single 2, Pair 2, and 4 of a Kind', () => {
      const single2 = evaluateCombo([makeCard(15, 'S')], POKER_JAWA_RULES)!;
      const pair2 = evaluateCombo([makeCard(15, 'S'), makeCard(15, 'H')], POKER_JAWA_RULES)!;
      const fourOfAKind = evaluateCombo([
        makeCard(10, 'S'), makeCard(10, 'H'), makeCard(10, 'C'), makeCard(10, 'D')
      ], POKER_JAWA_RULES)!;

      const straightFlush = evaluateCombo([
        makeCard(5, 'C'), makeCard(6, 'C'), makeCard(7, 'C'), makeCard(8, 'C'), makeCard(9, 'C')
      ], POKER_JAWA_RULES)!;

      expect(canBeat(single2, straightFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(pair2, straightFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(fourOfAKind, straightFlush, POKER_JAWA_RULES)).toBe(true);
    });
  });

  describe('Opening Card Validation', () => {
    it('requires 3 Wajik (3♦) on first turn under Poker Jawa rules and 3 Waru (3♠) under default rules', () => {
      const card3D = makeCard(3, 'D');
      const card3S = makeCard(3, 'S');

      // In Poker Jawa (discardThrees: false, openingCard: '3D'), first turn with 3S fails and 3D succeeds
      const playWith3S = validatePlay([card3S], null, true, POKER_JAWA_RULES);
      expect(playWith3S.valid).toBe(false);
      expect(playWith3S.error).toContain('3♦ (3 Wajik)');

      const playWith3D = validatePlay([card3D], null, true, POKER_JAWA_RULES);
      expect(playWith3D.valid).toBe(true);

      // In traditional Remi with discardThrees: false, 3 Waru (3♠) is strictly required! 3 Wajik must fail
      const rules3SNoDiscard = { ...DEFAULT_RULES, discardThrees: false };
      const defPlay3S = validatePlay([card3S], null, true, rules3SNoDiscard);
      expect(defPlay3S.valid).toBe(true);

      const defPlay3D = validatePlay([card3D], null, true, rules3SNoDiscard);
      expect(defPlay3D.valid).toBe(false);
      expect(defPlay3D.error).toContain('3 Waru (3♠)');

      // In DEFAULT_RULES (discardThrees: true), all 3s are discarded at game start so any legal play is valid
      const defPlayKing = validatePlay([makeCard(13, 'S')], null, true, DEFAULT_RULES);
      expect(defPlayKing.valid).toBe(true);
    });
  });

  describe('Poker Jawa Specific Rule Nuances', () => {
    it('Full House with 2s is the LOWEST in Poker Jawa (and As is the highest)', () => {
      // FH with 2s: 2-2-2-5-5
      const fhTwos = evaluateCombo([
        makeCard(15, 'S'), makeCard(15, 'H'), makeCard(15, 'C'),
        makeCard(5, 'S'), makeCard(5, 'C')
      ], POKER_JAWA_RULES)!;

      // FH with 3s: 3-3-3-4-4
      const fhThrees = evaluateCombo([
        makeCard(3, 'S'), makeCard(3, 'H'), makeCard(3, 'C'),
        makeCard(4, 'S'), makeCard(4, 'C')
      ], POKER_JAWA_RULES)!;

      // FH with Aces: A-A-A-4-4
      const fhAces = evaluateCombo([
        makeCard(14, 'S'), makeCard(14, 'H'), makeCard(14, 'C'),
        makeCard(4, 'S'), makeCard(4, 'C')
      ], POKER_JAWA_RULES)!;

      // In Poker Jawa: "nilai terendah adalah tris 2 dengan dobel apapun"
      expect(canBeat(fhTwos, fhThrees, POKER_JAWA_RULES)).toBe(true); // 3s beat 2s
      expect(canBeat(fhThrees, fhTwos, POKER_JAWA_RULES)).toBe(false);

      // Aces beat 3s and 2s
      expect(canBeat(fhThrees, fhAces, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(fhTwos, fhAces, POKER_JAWA_RULES)).toBe(true);

      // BUT in DEFAULT_RULES, 2 is highest
      expect(canBeat(fhAces, fhTwos, DEFAULT_RULES)).toBe(true);
    });

    it('supports Brother 2-3 and Brother Panjang 2-3-4 in Poker Jawa', () => {
      // Brother 2-3: pair of 2s and pair of 3s
      const b23 = evaluateCombo([
        makeCard(15, 'S'), makeCard(15, 'H'),
        makeCard(3, 'C'), makeCard(3, 'D')
      ], POKER_JAWA_RULES);
      expect(b23).not.toBeNull();
      expect(b23?.type).toBe('BROTHER');
      expect(b23?.mainRank).toBe(3);

      // Brother Panjang 2-3-4
      const bp234 = evaluateCombo([
        makeCard(15, 'S'), makeCard(15, 'H'),
        makeCard(3, 'C'), makeCard(3, 'D'),
        makeCard(4, 'S'), makeCard(4, 'C')
      ], POKER_JAWA_RULES);
      expect(bp234).not.toBeNull();
      expect(bp234?.type).toBe('BROTHER_PANJANG');
      expect(bp234?.mainRank).toBe(4);
    });

    it('Straight Flush and Royal Straight Flush bomb non-bomb hands in Poker Jawa', () => {
      const tris = evaluateCombo([
        makeCard(8, 'S'), makeCard(8, 'H'), makeCard(8, 'C')
      ], POKER_JAWA_RULES)!;

      const pair = evaluateCombo([
        makeCard(10, 'S'), makeCard(10, 'H')
      ], POKER_JAWA_RULES)!;

      const straightFlush = evaluateCombo([
        makeCard(5, 'C'), makeCard(6, 'C'), makeCard(7, 'C'), makeCard(8, 'C'), makeCard(9, 'C')
      ], POKER_JAWA_RULES)!;

      const royalFlush = evaluateCombo([
        makeCard(10, 'S'), makeCard(11, 'S'), makeCard(12, 'S'), makeCard(13, 'S'), makeCard(14, 'S')
      ], POKER_JAWA_RULES)!;

      // Straight Flush bombs Tris and Pair
      expect(canBeat(tris, straightFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(pair, straightFlush, POKER_JAWA_RULES)).toBe(true);

      // Royal Straight Flush bombs Tris, Pair, and Straight Flush
      expect(canBeat(tris, royalFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(pair, royalFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(straightFlush, royalFlush, POKER_JAWA_RULES)).toBe(true);
    });

    it('Royal Flush and Straight Flush can beat Brother and Split in Poker Jawa', () => {
      const brother = evaluateCombo([
        makeCard(6, 'S'), makeCard(6, 'H'),
        makeCard(7, 'C'), makeCard(7, 'D')
      ], POKER_JAWA_RULES)!;

      const split = evaluateCombo([
        makeCard(5, 'S'), makeCard(6, 'S'), makeCard(7, 'S'),
        makeCard(9, 'H'), makeCard(9, 'D')
      ], POKER_JAWA_RULES)!;

      const straightFlush = evaluateCombo([
        makeCard(5, 'C'), makeCard(6, 'C'), makeCard(7, 'C'), makeCard(8, 'C'), makeCard(9, 'C')
      ], POKER_JAWA_RULES)!;

      const royalFlush = evaluateCombo([
        makeCard(10, 'S'), makeCard(11, 'S'), makeCard(12, 'S'), makeCard(13, 'S'), makeCard(14, 'S')
      ], POKER_JAWA_RULES)!;

      expect(canBeat(brother, straightFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(brother, royalFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(split, straightFlush, POKER_JAWA_RULES)).toBe(true);
      expect(canBeat(split, royalFlush, POKER_JAWA_RULES)).toBe(true);
    });
  });
});
