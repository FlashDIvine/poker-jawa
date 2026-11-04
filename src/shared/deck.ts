import { Card, Suit } from './types.js';

export const SUIT_ORDER: Record<Suit, { value: number; symbol: string; name: string; color: 'black' | 'red' }> = {
  S: { value: 1, symbol: '♠', name: 'Waru', color: 'black' },
  C: { value: 2, symbol: '♣', name: 'Keriting', color: 'black' },
  D: { value: 3, symbol: '♦', name: 'Wajik', color: 'red' },
  H: { value: 4, symbol: '♥', name: 'Hati', color: 'red' }
};

export const RANK_LABELS: Record<number, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'As',
  15: '2'
};

export function createDeck(): Card[] {
  const suits: Suit[] = ['S', 'C', 'D', 'H'];
  const cards: Card[] = [];

  for (let rank = 3; rank <= 15; rank++) {
    for (const suit of suits) {
      const suitInfo = SUIT_ORDER[suit];
      cards.push({
        id: `${RANK_LABELS[rank]}${suit}`,
        rank,
        suit,
        suitValue: suitInfo.value,
        rankLabel: RANK_LABELS[rank],
        suitSymbol: suitInfo.symbol,
        suitName: suitInfo.name,
        color: suitInfo.color,
        isPoker: rank === 15,
        isAce: rank === 14,
        isThreeSpades: rank === 3 && suit === 'S'
      });
    }
  }

  return cards;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealDeck(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  if (deck.length !== 52) {
    throw new Error('A standard deck of 52 cards is required to deal');
  }

  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  for (let i = 0; i < deck.length; i++) {
    hands[i % 4].push(deck[i]);
  }

  // Sort each hand by rank then suit by default
  for (let i = 0; i < 4; i++) {
    hands[i] = sortCards(hands[i], 'rank');
  }

  return hands;
}

export function sortCards(cards: Card[], sortBy: 'rank' | 'suit' = 'rank'): Card[] {
  return [...cards].sort((a, b) => {
    if (sortBy === 'rank') {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.suitValue - b.suitValue;
    } else {
      if (a.suitValue !== b.suitValue) {
        return a.suitValue - b.suitValue;
      }
      return a.rank - b.rank;
    }
  });
}

export function findPlayerWithThreeSpades(hands: Card[][]): number {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.isThreeSpades)) {
      return i;
    }
  }
  return -1;
}
