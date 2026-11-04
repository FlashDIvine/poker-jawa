import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealDeck, sortCards, findPlayerWithThreeSpades } from '../src/shared/deck.js';

describe('Deck logic', () => {
  it('creates 52 unique cards with correct ranks and suits', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);

    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(52);

    // 4 cards of rank 3 up to rank 15 (2)
    for (let r = 3; r <= 15; r++) {
      const cardsOfRank = deck.filter(c => c.rank === r);
      expect(cardsOfRank).toHaveLength(4);
    }

    // Check 3 Waru (3♠)
    const threeSpades = deck.find(c => c.isThreeSpades);
    expect(threeSpades).toBeDefined();
    expect(threeSpades?.rank).toBe(3);
    expect(threeSpades?.suit).toBe('S');
    expect(threeSpades?.suitValue).toBe(1);

    // Check 2s (Poker)
    const pokers = deck.filter(c => c.isPoker);
    expect(pokers).toHaveLength(4);
    pokers.forEach(p => expect(p.rank).toBe(15));
  });

  it('shuffles the deck randomly', () => {
    const deck1 = createDeck();
    const deck2 = shuffleDeck(deck1);
    expect(deck2).toHaveLength(52);
    // Almost certainly not identical order
    const isIdentical = deck1.every((c, idx) => c.id === deck2[idx].id);
    expect(isIdentical).toBe(false);
  });

  it('deals 13 cards to each of the 4 players', () => {
    const deck = shuffleDeck(createDeck());
    const hands = dealDeck(deck);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(13);
    }
  });

  it('finds player holding 3 of Spades (3 Waru)', () => {
    const deck = shuffleDeck(createDeck());
    const hands = dealDeck(deck);
    const starterIdx = findPlayerWithThreeSpades(hands);
    expect(starterIdx).toBeGreaterThanOrEqual(0);
    expect(starterIdx).toBeLessThan(4);
    expect(hands[starterIdx].some(c => c.isThreeSpades)).toBe(true);
  });

  it('correctly sorts cards by rank and suit', () => {
    const cards = [
      { id: '2H', rank: 15, suit: 'H', suitValue: 4 },
      { id: '3S', rank: 3, suit: 'S', suitValue: 1 },
      { id: '2S', rank: 15, suit: 'S', suitValue: 1 },
      { id: '5D', rank: 5, suit: 'D', suitValue: 3 },
    ] as any;

    const sortedByRank = sortCards(cards, 'rank');
    expect(sortedByRank.map(c => c.id)).toEqual(['3S', '5D', '2S', '2H']);
  });
});
