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

export function createDeck(_deckCount: number = 1): Card[] {
  const suits: Suit[] = ['S', 'C', 'D', 'H'];
  const cards: Card[] = [];

  // Strictly 1 deck (52 cards) always
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

export function dealDeck(deck: Card[], playerCount: number = 4): Card[][] {
  if (deck.length < playerCount) {
    throw new Error('Deck does not contain enough cards to deal');
  }
  if (playerCount < 2 || playerCount > 10) {
    throw new Error('Player count must be between 2 and 10');
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < deck.length; i++) {
    hands[i % playerCount].push(deck[i]);
  }

  // Sort each hand by rank then suit by default
  for (let i = 0; i < playerCount; i++) {
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

export function findStarterPlayer(
  hands: Card[][],
  openingCard: '3S' | '3D' | 'any_3' = '3S'
): number {
  if (openingCard === '3D') {
    for (let i = 0; i < hands.length; i++) {
      if (hands[i].some(c => c.rank === 3 && c.suit === 'D')) {
        return i;
      }
    }
  }

  // Default or fallback to 3 Waru (3♠)
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.isThreeSpades)) {
      return i;
    }
  }

  // Fallback: any card of rank 3
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.rank === 3)) {
      return i;
    }
  }

  // Fallback: player holding lowest rank card
  let minRank = 99;
  let minIdx = 0;
  for (let i = 0; i < hands.length; i++) {
    for (const c of hands[i]) {
      if (c.rank < minRank) {
        minRank = c.rank;
        minIdx = i;
      }
    }
  }
  return minIdx;
}

export function findPlayerWithThreeSpades(hands: Card[][]): number {
  return findStarterPlayer(hands, '3S');
}
