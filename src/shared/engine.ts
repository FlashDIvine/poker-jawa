import { Card, ComboType, GameRules, HandCombo, PlayedTrick, DEFAULT_RULES, Suit } from './types.js';

export function getSuitRank(suit: Suit): number {
  switch (suit) {
    case 'S': return 4; // Sekop (Waru) - Highest
    case 'H': return 3; // Hati
    case 'C': return 2; // Keriting
    case 'D': return 1; // Wajik - Lowest
  }
}

interface StraightResult {
  valid: boolean;
  mainRank: number;
  highCard: Card;
  label: string;
}

function checkStraight5(cards: Card[]): StraightResult | null {
  if (cards.length !== 5) return null;
  const ranksSet = new Set(cards.map(c => c.rank));
  if (ranksSet.size !== 5) return null;

  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  const ranks = sorted.map(c => c.rank);

  // Normal consecutive 3..7 up to 10..14 (10-J-Q-K-A)
  if (ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1 && ranks[3] === ranks[2] + 1 && ranks[4] === ranks[3] + 1 && ranks[4] <= 14) {
    return {
      valid: true,
      mainRank: ranks[4],
      highCard: sorted[4],
      label: `${sorted[0].rankLabel}-${sorted[4].rankLabel}`
    };
  }

  // A-2-3-4-5 (ranks: 3, 4, 5, 14, 15) -> lowest straight (5-high)
  if (ranks[0] === 3 && ranks[1] === 4 && ranks[2] === 5 && ranks[3] === 14 && ranks[4] === 15) {
    return {
      valid: true,
      mainRank: 5,
      highCard: sorted[2],
      label: 'As-5'
    };
  }

  // 2-3-4-5-6 (ranks: 3, 4, 5, 6, 15) -> 6-high straight
  if (ranks[0] === 3 && ranks[1] === 4 && ranks[2] === 5 && ranks[3] === 6 && ranks[4] === 15) {
    return {
      valid: true,
      mainRank: 6,
      highCard: sorted[3],
      label: '2-6'
    };
  }

  return null;
}

interface ColorTrisResult {
  valid: boolean;
  mainRank: number;
  highCard: Card;
  label: string;
}

function checkColorTris3(cards: Card[]): ColorTrisResult | null {
  if (cards.length !== 3) return null;
  if (cards[0].suit !== cards[1].suit || cards[1].suit !== cards[2].suit) return null;
  const ranksSet = new Set(cards.map(c => c.rank));
  if (ranksSet.size !== 3) return null;

  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  const ranks = sorted.map(c => c.rank);

  // Normal consecutive 3..5 up to Q-K-A (12, 13, 14)
  if (ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1 && ranks[2] <= 14) {
    return {
      valid: true,
      mainRank: ranks[2],
      highCard: sorted[2],
      label: `${sorted[0].rankLabel}-${sorted[2].rankLabel}`
    };
  }

  // A-2-3 (ranks: 3, 14, 15) -> lowest color tris (3-high)
  if (ranks[0] === 3 && ranks[1] === 14 && ranks[2] === 15) {
    return {
      valid: true,
      mainRank: 3,
      highCard: sorted[0],
      label: 'As-3'
    };
  }

  // 2-3-4 (ranks: 3, 4, 15) -> 4-high color tris
  if (ranks[0] === 3 && ranks[1] === 4 && ranks[2] === 15) {
    return {
      valid: true,
      mainRank: 4,
      highCard: sorted[1],
      label: '2-4'
    };
  }

  return null;
}

interface BrotherResult {
  valid: boolean;
  mainRank: number;
  highPairCards: [Card, Card];
  label: string;
}

function checkBrother4(cards: Card[]): BrotherResult | null {
  if (cards.length !== 4) return null;
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  if (sorted[0].rank !== sorted[1].rank || sorted[2].rank !== sorted[3].rank) return null;
  const r1 = sorted[0].rank;
  const r2 = sorted[2].rank;
  if (r1 === r2) return null; // 4 of a kind, not brother

  // Normal consecutive pairs: e.g. 6-6 and 7-7 up to K-K and As-As (13, 14)
  if (r2 === r1 + 1 && r2 <= 14) {
    return {
      valid: true,
      mainRank: r2,
      highPairCards: [sorted[2], sorted[3]],
      label: `${sorted[0].rankLabel}-${sorted[2].rankLabel}`
    };
  }

  // Low brother: As-As and 2-2 (ranks 14, 15) -> lowest brother (rank 2)
  if (r1 === 14 && r2 === 15) {
    return {
      valid: true,
      mainRank: 2,
      highPairCards: [sorted[2], sorted[3]],
      label: 'As-2'
    };
  }

  // Low brother: 2-2 and 3-3 (ranks 3, 15) -> brother of 2-3 (mainRank 3, higher pair is 3s)
  if (r1 === 3 && r2 === 15) {
    return {
      valid: true,
      mainRank: 3,
      highPairCards: [sorted[0], sorted[1]],
      label: '2-3'
    };
  }

  return null;
}

interface BrotherPanjangResult {
  valid: boolean;
  mainRank: number;
  highPairCards: [Card, Card];
  label: string;
}

function checkBrotherPanjang6(cards: Card[]): BrotherPanjangResult | null {
  if (cards.length !== 6) return null;
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  if (
    sorted[0].rank !== sorted[1].rank ||
    sorted[2].rank !== sorted[3].rank ||
    sorted[4].rank !== sorted[5].rank
  ) return null;

  const r1 = sorted[0].rank;
  const r2 = sorted[2].rank;
  const r3 = sorted[4].rank;
  if (r1 === r2 || r2 === r3) return null;

  // Normal consecutive: e.g. 6-6, 7-7, 8-8 up to Q-Q, K-K, As-As (12, 13, 14)
  if (r2 === r1 + 1 && r3 === r2 + 1 && r3 <= 14) {
    return {
      valid: true,
      mainRank: r3,
      highPairCards: [sorted[4], sorted[5]],
      label: `${sorted[0].rankLabel}-${sorted[2].rankLabel}-${sorted[4].rankLabel}`
    };
  }

  // Low brother panjang: As-As, 2-2, 3-3 (ranks 3, 14, 15)
  if (r1 === 3 && r2 === 14 && r3 === 15) {
    return {
      valid: true,
      mainRank: 3,
      highPairCards: [sorted[0], sorted[1]],
      label: 'As-2-3'
    };
  }

  // Low brother panjang: 2-2, 3-3, 4-4 (ranks 3, 4, 15)
  if (r1 === 3 && r2 === 4 && r3 === 15) {
    return {
      valid: true,
      mainRank: 4,
      highPairCards: [sorted[2], sorted[3]],
      label: '2-3-4'
    };
  }

  return null;
}

interface SplitResult {
  valid: boolean;
  colorMainRank: number;
  colorSuit: Suit;
  highColorCard: Card;
  label: string;
}

function checkSplit5(cards: Card[]): SplitResult | null {
  if (cards.length !== 5) return null;

  const combos3Indices = [
    [0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 2, 3], [0, 2, 4],
    [0, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]
  ];

  let bestSplit: SplitResult | null = null;

  for (const idxs of combos3Indices) {
    const colorCards = idxs.map(i => cards[i]);
    const otherCards = [0, 1, 2, 3, 4].filter(i => !idxs.includes(i)).map(i => cards[i]);

    if (otherCards[0].rank !== otherCards[1].rank) continue;

    const colorInfo = checkColorTris3(colorCards);
    if (!colorInfo) continue;

    const splitInfo: SplitResult = {
      valid: true,
      colorMainRank: colorInfo.mainRank,
      colorSuit: colorCards[0].suit,
      highColorCard: colorInfo.highCard,
      label: `Color ${colorInfo.highCard.suitSymbol} (${colorInfo.label}) + Pair ${otherCards[0].rankLabel}`
    };

    if (
      !bestSplit ||
      splitInfo.colorMainRank > bestSplit.colorMainRank ||
      (splitInfo.colorMainRank === bestSplit.colorMainRank &&
        getSuitRank(splitInfo.colorSuit) > getSuitRank(bestSplit.colorSuit))
    ) {
      bestSplit = splitInfo;
    }
  }

  return bestSplit;
}

/**
 * Evaluates a set of selected cards and returns the HandCombo representation if valid,
 * or null if the cards do not form an allowed combination in the active ruleset.
 */
export function evaluateCombo(cards: Card[], rules: GameRules = DEFAULT_RULES): HandCombo | null {
  if (!cards || cards.length === 0 || cards.length > 6) {
    return null;
  }

  // 1 card: Single (Satuan)
  if (cards.length === 1) {
    const card = cards[0];
    let desc = `Satuan ${card.rankLabel}${card.suitSymbol}`;
    if (card.isPoker) {
      desc = `Poker ${card.rankLabel}${card.suitSymbol}`;
    } else if (card.isAce) {
      desc = `As ${card.rankLabel}${card.suitSymbol}`;
    }

    const suitVal = rules.allowCompareSuitsOnSameRank ? getSuitRank(card.suit) : card.suitValue;

    return {
      type: 'SINGLE',
      cards: [...cards],
      mainRank: card.rank,
      highestSuitValue: suitVal,
      description: desc
    };
  }

  // 2 cards: Pair (Kembar 2)
  if (cards.length === 2) {
    if (cards[0].rank === cards[1].rank) {
      const highestSuit = rules.allowCompareSuitsOnSameRank
        ? Math.max(getSuitRank(cards[0].suit), getSuitRank(cards[1].suit))
        : Math.max(cards[0].suitValue, cards[1].suitValue);

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

  // 3 cards: Tris OR Color Tris
  if (cards.length === 3) {
    // 1) Color Tris (Poker Jawa: 3 cards consecutive of same suit)
    if (rules.allowColorTris) {
      const colorTris = checkColorTris3(cards);
      if (colorTris) {
        return {
          type: 'COLOR_TRIS',
          cards: [...cards],
          mainRank: colorTris.mainRank,
          highestSuitValue: getSuitRank(colorTris.highCard.suit),
          suit: colorTris.highCard.suit,
          description: `Color Tris ${colorTris.highCard.suitSymbol} (${colorTris.label})`
        };
      }
    }

    // 2) Tris (Three of a Kind)
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      const highestSuit = rules.allowCompareSuitsOnSameRank
        ? Math.max(getSuitRank(cards[0].suit), getSuitRank(cards[1].suit), getSuitRank(cards[2].suit))
        : Math.max(cards[0].suitValue, cards[1].suitValue, cards[2].suitValue);

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

  // 4 cards: Bong (Four of a Kind / 4-card Straight Flush) OR Brother (2 consecutive pairs)
  if (cards.length === 4) {
    // 1) Four of a Kind
    if (
      rules.allowBongFour &&
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

    // 2) 4-card Straight Flush
    if (rules.allowBongSF4) {
      const sorted = [...cards].sort((a, b) => a.rank - b.rank);
      const sameSuit = sorted.every(c => c.suit === sorted[0].suit);
      const isConsecutive =
        sorted[1].rank === sorted[0].rank + 1 &&
        sorted[2].rank === sorted[1].rank + 1 &&
        sorted[3].rank === sorted[2].rank + 1;

      if (sameSuit && isConsecutive) {
        const suitVal = rules.allowCompareSuitsOnSameRank ? getSuitRank(sorted[0].suit) : sorted[0].suitValue;
        return {
          type: 'BONG_SF',
          cards: sorted,
          mainRank: sorted[3].rank,
          highestSuitValue: suitVal,
          description: `Bong Straight Flush ${sorted[0].suitSymbol} (${sorted[0].rankLabel}-${sorted[3].rankLabel})`
        };
      }
    }

    // 3) Brother (2 consecutive pairs in Poker Jawa)
    if (rules.allowBrother) {
      const brother = checkBrother4(cards);
      if (brother) {
        const maxSuit = Math.max(
          getSuitRank(brother.highPairCards[0].suit),
          getSuitRank(brother.highPairCards[1].suit)
        );
        return {
          type: 'BROTHER',
          cards: [...cards],
          mainRank: brother.mainRank,
          highestSuitValue: maxSuit,
          description: `Brother (${brother.label})`
        };
      }
    }

    return null;
  }

  // 5 cards: Paket (Royal Flush > Straight Flush > Split > Full House > Colour > Straight)
  if (cards.length === 5) {
    const sameSuit = cards.every(c => c.suit === cards[0].suit);
    const sorted = [...cards].sort((a, b) => a.rank - b.rank);
    const straightInfo = checkStraight5(cards);

    // 1) Royal Straight Flush (10-J-Q-K-As same suit)
    if (rules.allowRoyalFlush && sameSuit) {
      const ranks = sorted.map(c => c.rank);
      if (ranks[0] === 10 && ranks[1] === 11 && ranks[2] === 12 && ranks[3] === 13 && ranks[4] === 14) {
        return {
          type: 'ROYAL_FLUSH',
          cards: sorted,
          mainRank: 14,
          highestSuitValue: getSuitRank(cards[0].suit),
          suit: cards[0].suit,
          level: 6,
          description: `Royal Straight Flush ${cards[0].suitSymbol}`
        };
      }
    }

    // 2) 5-card Straight Flush (Flush in Poker Jawa)
    if (rules.allowStraightFlush5 && sameSuit && straightInfo) {
      return {
        type: 'STRAIGHT_FLUSH',
        cards: sorted,
        mainRank: straightInfo.mainRank,
        highestSuitValue: getSuitRank(cards[0].suit),
        suit: cards[0].suit,
        level: 5,
        description: `Straight Flush ${cards[0].suitSymbol} (${straightInfo.label})`
      };
    }

    // 3) Split (Color 3 kartu + 1 pair)
    if (rules.allowSplit) {
      const splitInfo = checkSplit5(cards);
      if (splitInfo) {
        return {
          type: 'SPLIT',
          cards: [...cards],
          mainRank: splitInfo.colorMainRank,
          highestSuitValue: getSuitRank(splitInfo.colorSuit),
          level: 4,
          description: splitInfo.label
        };
      }
    }

    // 4) Full House (3 of a kind + pair)
    if (rules.allowFullHouse) {
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
          tripletRank = 0;
          pairRank = 0;
        }

        if (tripletRank > 0) {
          const tripletCards = cards.filter(c => c.rank === tripletRank);
          const maxTripletSuit = rules.allowCompareSuitsOnSameRank
            ? Math.max(...tripletCards.map(c => getSuitRank(c.suit)))
            : Math.max(...tripletCards.map(c => c.suitValue));

          const rName = tripletCards[0].rankLabel;
          const pairCards = cards.filter(c => c.rank === pairRank);
          const pName = pairCards[0].rankLabel;

          return {
            type: 'FULL_HOUSE',
            cards: [...cards],
            mainRank: tripletRank,
            highestSuitValue: maxTripletSuit,
            level: 3,
            description: `Full House (${rName}s over ${pName}s)`
          };
        }
      }
    }

    // 5) Colour / Flush (5 cards same suit, not consecutive)
    if (rules.allowFlush && sameSuit) {
      const maxRank = Math.max(...cards.map(c => c.rank));
      return {
        type: 'FLUSH',
        cards: sorted,
        mainRank: maxRank,
        highestSuitValue: getSuitRank(cards[0].suit),
        suit: cards[0].suit,
        level: 2,
        description: `Colour ${cards[0].suitSymbol}`
      };
    }

    // 6) Straight (5 consecutive cards, mixed suits)
    if (rules.allowStraight && straightInfo) {
      return {
        type: 'STRAIGHT',
        cards: sorted,
        mainRank: straightInfo.mainRank,
        highestSuitValue: getSuitRank(straightInfo.highCard.suit),
        level: 1,
        description: `Straight (${straightInfo.label})`
      };
    }

    return null;
  }

  // 6 cards: Brother Panjang (3 consecutive pairs in Poker Jawa)
  if (cards.length === 6) {
    if (rules.allowBrotherPanjang) {
      const bp = checkBrotherPanjang6(cards);
      if (bp) {
        const maxSuit = Math.max(
          getSuitRank(bp.highPairCards[0].suit),
          getSuitRank(bp.highPairCards[1].suit)
        );
        return {
          type: 'BROTHER_PANJANG',
          cards: [...cards],
          mainRank: bp.mainRank,
          highestSuitValue: maxSuit,
          description: `Brother Panjang (${bp.label})`
        };
      }
    }
    return null;
  }

  return null;
}

/**
 * Checks whether challengeCombo can beat leadCombo according to the active ruleset.
 */
export function canBeat(
  leadCombo: HandCombo,
  challengeCombo: HandCombo,
  rules: GameRules = DEFAULT_RULES
): boolean {
  // 1. Royal Straight Flush beats EVERYTHING except an equal/lower RSF
  if (challengeCombo.type === 'ROYAL_FLUSH') {
    if (leadCombo.type === 'ROYAL_FLUSH') {
      return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
    }
    return true;
  }
  if (leadCombo.type === 'ROYAL_FLUSH') {
    return false;
  }

  // 2. 5-card Straight Flush (Flush in Poker Jawa) is a top-tier bomb
  if (challengeCombo.type === 'STRAIGHT_FLUSH') {
    if (leadCombo.type === 'STRAIGHT_FLUSH') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
    }
    // In Poker Jawa / rules allowing 5-card SF, Flush beats all lower hands & bombs
    if (rules.preset === 'poker_jawa' || rules.allowStraightFlush5) {
      if (
        leadCombo.type === 'BONG_FOUR' ||
        leadCombo.type === 'BONG_SF' ||
        leadCombo.type === 'SINGLE' ||
        leadCombo.type === 'PAIR' ||
        leadCombo.type === 'TRIS' ||
        leadCombo.type === 'COLOR_TRIS' ||
        leadCombo.type === 'BROTHER' ||
        leadCombo.type === 'BROTHER_PANJANG' ||
        (leadCombo.level !== undefined && leadCombo.level < 5)
      ) {
        return true;
      }
    }
  }
  if (leadCombo.type === 'STRAIGHT_FLUSH') {
    return false;
  }

  // 3. 4-card Bombs (Bong Four of a Kind & Bong SF)
  if (leadCombo.type === 'BONG_SF') {
    if (challengeCombo.type === 'BONG_SF') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      if (rules.allowCompareSuitsOnSameRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
      return false;
    }
    return false;
  }

  if (leadCombo.type === 'BONG_FOUR') {
    if (challengeCombo.type === 'BONG_SF') return true;
    if (challengeCombo.type === 'BONG_FOUR') {
      return challengeCombo.mainRank > leadCombo.mainRank;
    }
    return false;
  }

  // 4. Table is SINGLE
  if (leadCombo.type === 'SINGLE') {
    if (challengeCombo.type === 'SINGLE') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      if (rules.allowCompareSuitsOnSameRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
      return false;
    }

    // Special Cut Rule: Table has Single Ace (As, rank 14)
    if (leadCombo.mainRank === 14 && rules.cutAceWithTrisOrFH) {
      if (challengeCombo.type === 'TRIS' || challengeCombo.type === 'FULL_HOUSE') {
        return true;
      }
    }

    // Special Counter / Bomb Rule: Table has Single Poker (2, rank 15)
    if (leadCombo.mainRank === 15) {
      if (rules.cutTwoWithTrisOrFH) {
        if (challengeCombo.type === 'TRIS' || challengeCombo.type === 'FULL_HOUSE') {
          return true;
        }
      }
      if (rules.bombCanCutPoker || rules.pokerCutByBongLoses) {
        if (
          challengeCombo.type === 'BONG_FOUR' ||
          challengeCombo.type === 'BONG_SF' ||
          challengeCombo.type === 'STRAIGHT_FLUSH' ||
          challengeCombo.type === 'ROYAL_FLUSH'
        ) {
          return true;
        }
      }
    }

    return false;
  }

  // 5. Table is PAIR
  if (leadCombo.type === 'PAIR') {
    if (challengeCombo.type === 'PAIR') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      if (rules.allowCompareSuitsOnSameRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
      return false;
    }

    // Special Counter / Bomb Rule: In Poker Jawa or when pairAbsoluteRule is disabled,
    // BONG (Four of a Kind or Straight Flush) can cut Pair of 2 ("Poker")
    if (
      (!rules.pairAbsoluteRule || rules.preset === 'poker_jawa') &&
      leadCombo.mainRank === 15 &&
      (rules.bombCanCutPoker || rules.pokerCutByBongLoses)
    ) {
      if (
        challengeCombo.type === 'BONG_FOUR' ||
        challengeCombo.type === 'BONG_SF' ||
        challengeCombo.type === 'STRAIGHT_FLUSH' ||
        challengeCombo.type === 'ROYAL_FLUSH'
      ) {
        return true;
      }
    }

    return false;
  }

  // 6. Table is TRIS
  if (leadCombo.type === 'TRIS') {
    if (challengeCombo.type === 'TRIS') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      if (rules.allowCompareSuitsOnSameRank) {
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }
      return false;
    }

    // In Poker Jawa: Color Tris always beats regular Tris
    if (rules.allowColorTris && challengeCombo.type === 'COLOR_TRIS') {
      return true;
    }

    return false;
  }

  // 7. Table is COLOR_TRIS
  if (leadCombo.type === 'COLOR_TRIS') {
    if (challengeCombo.type === 'COLOR_TRIS') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
    }
    return false;
  }

  // 8. Table is BROTHER
  if (leadCombo.type === 'BROTHER') {
    if (challengeCombo.type === 'BROTHER') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
    }
    return false;
  }

  // 9. Table is BROTHER_PANJANG
  if (leadCombo.type === 'BROTHER_PANJANG') {
    if (challengeCombo.type === 'BROTHER_PANJANG') {
      if (challengeCombo.mainRank !== leadCombo.mainRank) {
        return challengeCombo.mainRank > leadCombo.mainRank;
      }
      return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
    }
    return false;
  }

  // 10. 5-Card Paket Hierarchy
  const is5CardPaket = (c: HandCombo) =>
    c.level !== undefined && c.level >= 1 && c.level <= 6;

  if (is5CardPaket(leadCombo) && is5CardPaket(challengeCombo)) {
    if (rules.allowPaketHierarchy) {
      if (challengeCombo.level! > leadCombo.level!) {
        return true;
      }
      if (challengeCombo.level! < leadCombo.level!) {
        return false;
      }

      // Same level comparison in Paket:
      if (challengeCombo.type === 'SPLIT') {
        if (challengeCombo.mainRank !== leadCombo.mainRank) {
          return challengeCombo.mainRank > leadCombo.mainRank;
        }
        return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
      }

      if (challengeCombo.type === 'FULL_HOUSE') {
        // In Poker Jawa: Triplet of 2s is the LOWEST (rank 2), Triplet of As is the HIGHEST (rank 14)
        const getFHRank = (c: HandCombo) => {
          if (rules.preset === 'poker_jawa' || rules.allowPaketHierarchy) {
            return c.mainRank === 15 ? 2 : c.mainRank;
          }
          return c.mainRank;
        };
        const leadFHRank = getFHRank(leadCombo);
        const chalFHRank = getFHRank(challengeCombo);

        if (chalFHRank !== leadFHRank) {
          return chalFHRank > leadFHRank;
        }
        if (rules.allowCompareSuitsOnSameRank) {
          return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
        }
        return false;
      }

      if (challengeCombo.type === 'FLUSH') {
        // In Poker Jawa Colour: suit ranking is primary (Sekop > Hati > Keriting > Wajik)
        if (challengeCombo.highestSuitValue !== leadCombo.highestSuitValue) {
          return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
        }
        return challengeCombo.mainRank > leadCombo.mainRank;
      }

      if (challengeCombo.type === 'STRAIGHT') {
        if (challengeCombo.mainRank !== leadCombo.mainRank) {
          return challengeCombo.mainRank > leadCombo.mainRank;
        }
        if (rules.allowCompareSuitsOnSameRank) {
          return challengeCombo.highestSuitValue > leadCombo.highestSuitValue;
        }
        return false;
      }
    } else {
      // In default remi: only matching combo types can challenge each other
      if (leadCombo.type === challengeCombo.type) {
        if (leadCombo.type === 'FULL_HOUSE') {
          return challengeCombo.mainRank > leadCombo.mainRank;
        }
      }
      return false;
    }
  }

  return false;
}

/**
 * Validates whether a proposed play is legitimate.
 */
export function validatePlay(
  cards: Card[],
  lastPlay: PlayedTrick | null,
  isFirstTurnOfGame: boolean,
  rules: GameRules = DEFAULT_RULES
): { valid: boolean; error?: string; combo?: HandCombo } {
  if (!cards || cards.length === 0) {
    return { valid: false, error: 'Pilih kartu terlebih dahulu untuk dikeluarkan.' };
  }

  const combo = evaluateCombo(cards, rules);
  if (!combo) {
    return {
      valid: false,
      error: 'Kombinasi kartu tidak valid sesuai aturan meja yang aktif!'
    };
  }

  // Opening lead of the game
  if (isFirstTurnOfGame) {
    if (rules.discardThrees) {
      // All 3s were automatically discarded from all players' hands at the start of the game.
      // The first turn player can freely play their first legal combo from remaining cards.
      return { valid: true, combo };
    }

    if (rules.openingCard === '3D') {
      const hasThreeDiamond = cards.some(c => c.rank === 3 && c.suit === 'D');
      if (!hasThreeDiamond) {
        return {
          valid: false,
          error: 'Langkah pertama harus membuang kartu atau kombinasi yang mengandung 3♦ (3 Wajik)!'
        };
      }
    } else if (rules.openingCard === '3S') {
      const hasThreeSpades = cards.some(c => c.isThreeSpades || (c.rank === 3 && c.suit === 'S'));
      if (!hasThreeSpades) {
        return {
          valid: false,
          error: 'Langkah pertama harus memuat kartu 3 Waru (3♠)!'
        };
      }
    } else {
      const hasThree = cards.some(c => c.rank === 3);
      if (!hasThree) {
        return {
          valid: false,
          error: 'Langkah pertama harus membuang kartu angka 3!'
        };
      }
    }
    return { valid: true, combo };
  }

  // If table is free (new trick lead)
  if (!lastPlay) {
    return { valid: true, combo };
  }

  // Subsequent play trying to beat lastPlay
  if (!canBeat(lastPlay.combo, combo, rules)) {
    return {
      valid: false,
      error: `Kombinasi tidak dapat mengalahkan ${lastPlay.combo.description} di meja!`
    };
  }

  return { valid: true, combo };
}
