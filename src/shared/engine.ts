import { Card, ComboType, HandCombo, PlayedTrick } from './types.js';

/**
 * Evaluates a set of selected cards and returns the HandCombo representation if valid,
 * or null if the cards do not form an allowed combination in this game variant.
 * 
 * Allowed combinations:
 * 1 card: Single (Satuan)
 * 2 cards: Pair (Kembar 2)
 * 3 cards: Tris (Kembar 3)
 * 4 cards: Bong (4 of a Kind OR 4-card Straight Flush)
 * 5 cards: Full House (3 of a Kind + Pair)
 */
export function evaluateCombo(cards: Card[]): HandCombo | null {
  if (!cards || cards.length === 0 || cards.length > 5) {
    return null;
  }

  // 1 card: Single
  if (cards.length === 1) {
    const card = cards[0];
    let desc = `Satuan ${card.rankLabel}${card.suitSymbol}`;
    if (card.isPoker) {
      desc = `Poker ${card.rankLabel}${card.suitSymbol}`;
    } else if (card.isAce) {
      desc = `As ${card.rankLabel}${card.suitSymbol}`;
    }

    return {
      type: 'SINGLE',
      cards: [...cards],
      mainRank: card.rank,
      highestSuitValue: card.suitValue,
      description: desc
    };
  }

  // 2 cards: Pair
  if (cards.length === 2) {
    if (cards[0].rank === cards[1].rank) {
      const highestSuit = Math.max(cards[0].suitValue, cards[1].suitValue);
      let desc = `Pair ${cards[0].rankLabel}`;
      if (cards[0].isPoker) {
        desc = `Pair Poker (2-2)`;
      } else if (cards[0].isAce) {
        desc = `Pair As (A-A)`;
      }

      return {
        type: 'PAIR',
        cards: [...cards],
        mainRank: cards[0].rank,
        highestSuitValue: highestSuit,
        description: desc
      };
    }
    return null;
  }

  // 3 cards: Tris (Three of a Kind)
  if (cards.length === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      const highestSuit = Math.max(cards[0].suitValue, cards[1].suitValue, cards[2].suitValue);
      let desc = `Tris ${cards[0].rankLabel}`;
      if (cards[0].isPoker) {
        desc = `Tris Poker (2-2-2)`;
      } else if (cards[0].isAce) {
        desc = `Tris As (A-A-A)`;
      }

      return {
        type: 'TRIS',
        cards: [...cards],
        mainRank: cards[0].rank,
        highestSuitValue: highestSuit,
        description: desc
      };
    }
    return null;
  }

  // 4 cards: Bong (4 of a Kind OR 4-card Straight Flush)
  if (cards.length === 4) {
    // 1) Four of a Kind
    if (
      cards[0].rank === cards[1].rank &&
      cards[1].rank === cards[2].rank &&
      cards[2].rank === cards[3].rank
    ) {
      return {
        type: 'BONG_FOUR',
        cards: [...cards],
        mainRank: cards[0].rank,
        highestSuitValue: 4,
        description: `Bong 4 of a Kind (${cards[0].rankLabel})`
      };
    }

    // 2) 4-card Straight Flush: all same suit & 4 consecutive ranks
    const sorted = [...cards].sort((a, b) => a.rank - b.rank);
    const sameSuit = sorted.every(c => c.suit === sorted[0].suit);
    const isConsecutive =
      sorted[1].rank === sorted[0].rank + 1 &&
      sorted[2].rank === sorted[1].rank + 1 &&
      sorted[3].rank === sorted[2].rank + 1;

    if (sameSuit && isConsecutive) {
      return {
        type: 'BONG_SF',
        cards: sorted,
        mainRank: sorted[3].rank,
        highestSuitValue: sorted[0].suitValue,
        description: `Bong Straight Flush ${sorted[0].suitSymbol} (${sorted[0].rankLabel}-${sorted[3].rankLabel})`
      };
    }

    return null;
  }

  // 5 cards: Full House only (3 of a kind + pair)
  if (cards.length === 5) {
    const counts: Record<number, number> = {};
    for (const c of cards) {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
    }

    const rankKeys = Object.keys(counts).map(Number);
    if (rankKeys.length === 2) {
      const [r1, r2] = rankKeys;
      let tripletRank: number;
      let pairRank: number;

      if (counts[r1] === 3 && counts[r2] === 2) {
        tripletRank = r1;
        pairRank = r2;
      } else if (counts[r1] === 2 && counts[r2] === 3) {
        tripletRank = r2;
        pairRank = r1;
      } else {
        return null;
      }

      const tripletCards = cards.filter(c => c.rank === tripletRank);
      const maxTripletSuit = Math.max(...tripletCards.map(c => c.suitValue));
      const rName = tripletCards[0].rankLabel;
      const pairCards = cards.filter(c => c.rank === pairRank);
      const pName = pairCards[0].rankLabel;

      return {
        type: 'FULL_HOUSE',
        cards: [...cards],
        mainRank: tripletRank,
        highestSuitValue: maxTripletSuit,
        description: `Full House (${rName}s over ${pName}s)`
      };
    }

    return null;
  }

  return null;
}

/**
 * Checks whether challengeCombo can beat leadCombo according to the Indonesian Poker Remi variant rules.
 */
export function canBeat(leadCombo: HandCombo, challengeCombo: HandCombo): boolean {
  // Scenario 1: Table is SINGLE
  if (leadCombo.type === 'SINGLE') {
    // Normal Single vs Single
    if (challengeCombo.type === 'SINGLE') {
      if (challengeCombo.mainRank > leadCombo.mainRank) return true;
      if (challengeCombo.mainRank === leadCombo.mainRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
      return false;
    }

    // Special Cut Rule: Table has Single Ace (As, rank 14)
    // "A single As can be countered by a higher As, Poker (2), Full House (3 of a kind + pair), or tris (3 of a kind)."
    if (leadCombo.mainRank === 14) {
      if (challengeCombo.type === 'TRIS') return true;
      if (challengeCombo.type === 'FULL_HOUSE') return true;
      if (challengeCombo.type === 'BONG_FOUR' || challengeCombo.type === 'BONG_SF') return true;
    }

    // Special Counter Rule: Table has Single Poker (2, rank 15)
    // "Poker (2) can be bombed/countered by Bong (Bomb: 4 of a kind, or 4-card straight flush)."
    if (leadCombo.mainRank === 15) {
      if (challengeCombo.type === 'BONG_FOUR' || challengeCombo.type === 'BONG_SF') return true;
    }

    return false;
  }

  // Scenario 2: Table is PAIR
  if (leadCombo.type === 'PAIR') {
    if (challengeCombo.type === 'PAIR') {
      if (challengeCombo.mainRank > leadCombo.mainRank) return true;
      if (challengeCombo.mainRank === leadCombo.mainRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
      return false;
    }

    // If Pair of Poker 2s, Bong can bomb it
    if (leadCombo.mainRank === 15) {
      if (challengeCombo.type === 'BONG_FOUR' || challengeCombo.type === 'BONG_SF') return true;
    }

    return false;
  }

  // Scenario 3: Table is TRIS (either led directly or used to cut an Ace)
  if (leadCombo.type === 'TRIS') {
    if (challengeCombo.type === 'TRIS') {
      return challengeCombo.mainRank > leadCombo.mainRank;
    }
    // Bong can bomb a Tris
    if (challengeCombo.type === 'BONG_FOUR' || challengeCombo.type === 'BONG_SF') return true;
    return false;
  }

  // Scenario 4: Table is FULL_HOUSE
  if (leadCombo.type === 'FULL_HOUSE') {
    // "Full House can be countered by a higher Full House (ranked by the triplet)."
    if (challengeCombo.type === 'FULL_HOUSE') {
      return challengeCombo.mainRank > leadCombo.mainRank;
    }
    // Bong can bomb a Full House
    if (challengeCombo.type === 'BONG_FOUR' || challengeCombo.type === 'BONG_SF') return true;
    return false;
  }

  // Scenario 5: Table is BONG (Four of a Kind)
  if (leadCombo.type === 'BONG_FOUR') {
    if (challengeCombo.type === 'BONG_FOUR') {
      return challengeCombo.mainRank > leadCombo.mainRank;
    }
    // Straight Flush beats 4 of a kind
    if (challengeCombo.type === 'BONG_SF') {
      return true;
    }
    return false;
  }

  // Scenario 6: Table is BONG (Straight Flush)
  if (leadCombo.type === 'BONG_SF') {
    if (challengeCombo.type === 'BONG_SF') {
      if (challengeCombo.mainRank > leadCombo.mainRank) return true;
      if (challengeCombo.mainRank === leadCombo.mainRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
    }
    return false;
  }

  return false;
}

/**
 * Validates whether a proposed play is legitimate.
 */
export function validatePlay(
  cards: Card[],
  lastPlay: PlayedTrick | null,
  isFirstTurnOfGame: boolean
): { valid: boolean; error?: string; combo?: HandCombo } {
  if (!cards || cards.length === 0) {
    return { valid: false, error: 'Pilih kartu terlebih dahulu untuk dikeluarkan.' };
  }

  const combo = evaluateCombo(cards);
  if (!combo) {
    return {
      valid: false,
      error: 'Kombinasi kartu tidak valid! (Hanya Satuan, Pair, Tris, Bong, atau Full House yang diperbolehkan).'
    };
  }

  // Opening lead of the game must include 3 Waru (3♠)
  if (isFirstTurnOfGame) {
    const hasThreeSpades = cards.some(c => c.isThreeSpades);
    if (!hasThreeSpades) {
      return {
        valid: false,
        error: 'Langkah pertama harus memuat kartu 3 Waru (3♠)!'
      };
    }
    return { valid: true, combo };
  }

  // If table is free (new trick lead)
  if (!lastPlay) {
    return { valid: true, combo };
  }

  // Subsequent play trying to beat lastPlay
  if (!canBeat(lastPlay.combo, combo)) {
    return {
      valid: false,
      error: `Kombinasi tidak dapat mengalahkan ${lastPlay.combo.description} di meja!`
    };
  }

  return { valid: true, combo };
}
