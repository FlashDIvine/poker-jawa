import { Card, HandCombo, PlayedTrick } from './types.js';
import { evaluateCombo, canBeat, validatePlay } from './engine.js';
import { sortCards } from './deck.js';

export const BOT_NAMES = [
  'Budi Santoso',
  'Siti Rahma',
  'Joko Perkasa',
  'Dewi Sartika',
  'Rian Capsa',
  'Andi Remi',
  'Maya Putri',
  'Fajar Pratama'
];

export const BOT_AVATARS = [
  '🤖', '🦊', '🐯', '🦁', '🐻', '🐼', '🐲', '🦅'
];

/**
 * Finds all possible valid combinations in a hand.
 */
export function findAllPossibleCombos(hand: Card[]): HandCombo[] {
  const combos: HandCombo[] = [];
  const sortedHand = sortCards(hand, 'rank');

  // 1. Singles
  for (const card of sortedHand) {
    const combo = evaluateCombo([card]);
    if (combo) combos.push(combo);
  }

  // Group by rank for pairs, tris, four of a kind, and full house
  const rankGroups: Record<number, Card[]> = {};
  for (const card of sortedHand) {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  }

  // 2. Pairs
  for (const cards of Object.values(rankGroups)) {
    if (cards.length >= 2) {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const combo = evaluateCombo([cards[i], cards[j]]);
          if (combo) combos.push(combo);
        }
      }
    }
  }

  // 3. Tris (Three of a Kind)
  for (const cards of Object.values(rankGroups)) {
    if (cards.length >= 3) {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          for (let k = j + 1; k < cards.length; k++) {
            const combo = evaluateCombo([cards[i], cards[j], cards[k]]);
            if (combo) combos.push(combo);
          }
        }
      }
    }
  }

  // 4. Bong: Four of a Kind
  for (const cards of Object.values(rankGroups)) {
    if (cards.length === 4) {
      const combo = evaluateCombo(cards);
      if (combo) combos.push(combo);
    }
  }

  // 5. Bong: 4-card Straight Flush
  // Group by suit
  const suitGroups: Record<string, Card[]> = {};
  for (const card of sortedHand) {
    if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
    suitGroups[card.suit].push(card);
  }

  for (const suitCards of Object.values(suitGroups)) {
    if (suitCards.length >= 4) {
      const sortedByRank = sortCards(suitCards, 'rank');
      for (let i = 0; i <= sortedByRank.length - 4; i++) {
        const slice = sortedByRank.slice(i, i + 4);
        const combo = evaluateCombo(slice);
        if (combo && combo.type === 'BONG_SF') {
          combos.push(combo);
        }
      }
    }
  }

  // 6. Full House: 3 of one rank + 2 of another rank
  const triplets = Object.entries(rankGroups).filter(([_, cards]) => cards.length >= 3);
  const pairsOrBetter = Object.entries(rankGroups).filter(([_, cards]) => cards.length >= 2);

  for (const [tRankStr, tCards] of triplets) {
    const tRank = Number(tRankStr);
    // Take first 3 cards for triplet
    const triplet = tCards.slice(0, 3);

    for (const [pRankStr, pCards] of pairsOrBetter) {
      const pRank = Number(pRankStr);
      if (pRank === tRank) continue; // cannot use same rank for triplet and pair

      const pair = pCards.slice(0, 2);
      const combo = evaluateCombo([...triplet, ...pair]);
      if (combo) combos.push(combo);
    }
  }

  return combos;
}

/**
 * Intelligent decision maker for AI Bots.
 * Returns cards to play, or null to pass (Lewat).
 */
export function decideBotMove(
  hand: Card[],
  lastPlay: PlayedTrick | null,
  isFirstTurnOfGame: boolean
): Card[] | null {
  const allCombos = findAllPossibleCombos(hand);

  // Case 1: First turn of the entire game (MUST contain 3 Waru / 3♠)
  if (isFirstTurnOfGame) {
    const validFirstPlays = allCombos.filter(combo =>
      combo.cards.some(c => c.isThreeSpades)
    );

    if (validFirstPlays.length === 0) {
      // Fallback: single 3 Waru
      const threeSpades = hand.find(c => c.isThreeSpades);
      return threeSpades ? [threeSpades] : [hand[0]];
    }

    // Prefer leading with a pair or tris of 3s if available, otherwise single 3♠
    const pairOrTris = validFirstPlays.find(c => c.type === 'PAIR' || c.type === 'TRIS');
    if (pairOrTris) return pairOrTris.cards;

    const single3S = validFirstPlays.find(c => c.type === 'SINGLE');
    if (single3S) return single3S.cards;

    return validFirstPlays[0].cards;
  }

  // Case 2: Free lead (lastPlay is null) - Player won the trick and starts new round
  if (!lastPlay) {
    // If hand has 1 or 2 cards left, dump them!
    if (hand.length <= 2) {
      const direct = evaluateCombo(hand);
      if (direct) return hand;
    }

    // Lead with smallest combos to shed lower cards
    // Priority: Low pairs, low tris, low singles, saving Poker and Bongs for counters
    const nonPokerCombos = allCombos.filter(c => c.mainRank < 15);

    // Try low pair (rank <= 8)
    const lowPair = nonPokerCombos.find(c => c.type === 'PAIR' && c.mainRank <= 8);
    if (lowPair) return lowPair.cards;

    // Try low tris (rank <= 9)
    const lowTris = nonPokerCombos.find(c => c.type === 'TRIS' && c.mainRank <= 9);
    if (lowTris) return lowTris.cards;

    // Try low Full House
    const lowFH = nonPokerCombos.find(c => c.type === 'FULL_HOUSE' && c.mainRank <= 9);
    if (lowFH) return lowFH.cards;

    // Lowest single
    const lowSingle = nonPokerCombos.find(c => c.type === 'SINGLE');
    if (lowSingle) return lowSingle.cards;

    // If only poker/high combos left, play smallest available
    if (allCombos.length > 0) {
      const sortedByRank = [...allCombos].sort((a, b) => a.mainRank - b.mainRank);
      return sortedByRank[0].cards;
    }

    return [hand[0]];
  }

  // Case 3: Responding to table lastPlay
  const candidateCombos = allCombos.filter(c => canBeat(lastPlay.combo, c));

  if (candidateCombos.length === 0) {
    return null; // Must pass
  }

  // If bot is down to 1-3 cards, play immediately to finish
  if (hand.length <= 3) {
    // Pick the lowest winning move
    candidateCombos.sort((a, b) => a.mainRank - b.mainRank);
    return candidateCombos[0].cards;
  }

  // Separate non-nuclear options from extreme bombs (Poker 2, Bong)
  const matchingTypeCombos = candidateCombos.filter(c => c.type === lastPlay.combo.type);
  if (matchingTypeCombos.length > 0) {
    // Sort by mainRank, then highestSuitValue
    matchingTypeCombos.sort((a, b) => {
      if (a.mainRank !== b.mainRank) return a.mainRank - b.mainRank;
      return a.highestSuitValue - b.highestSuitValue;
    });

    // Check if the lowest matching move is a Poker 2
    const lowest = matchingTypeCombos[0];
    if (lowest.mainRank === 15 && lastPlay.combo.mainRank <= 9) {
      // Don't waste a Poker 2 on a weak 7 or 8 unless necessary, 40% chance pass
      if (Math.random() < 0.4) return null;
    }

    return lowest.cards;
  }

  // If table is Ace and we have Full House or Tris or Poker 2
  if (lastPlay.combo.mainRank === 14 && lastPlay.combo.type === 'SINGLE') {
    // Prefer Tris or Full House over wasting a 2
    const trisOrFH = candidateCombos.find(c => c.type === 'TRIS' || c.type === 'FULL_HOUSE');
    if (trisOrFH) return trisOrFH.cards;

    const pokerSingle = candidateCombos.find(c => c.type === 'SINGLE' && c.mainRank === 15);
    if (pokerSingle) return pokerSingle.cards;
  }

  // If table is Poker (2) and we have Bong
  if (lastPlay.combo.mainRank === 15 && (lastPlay.combo.type === 'SINGLE' || lastPlay.combo.type === 'PAIR')) {
    const bong = candidateCombos.find(c => c.type === 'BONG_FOUR' || c.type === 'BONG_SF');
    if (bong) {
      // Bong the poker!
      return bong.cards;
    }
  }

  // Otherwise pick the lowest candidate combo
  candidateCombos.sort((a, b) => a.mainRank - b.mainRank);
  return candidateCombos[0].cards;
}
