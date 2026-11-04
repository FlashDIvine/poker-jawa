import { Card, GameRules, HandCombo, PlayedTrick, DEFAULT_RULES } from './types.js';
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
  'Fajar Pratama',
  'Bambang Wijaya',
  'Lestari Ayu',
  'Dimas Raditya',
  'Mega Suryani',
  'Surya Kencana',
  'Nadia Clarissa',
  'Eko Prabowo',
  'Tari Anggraini'
];

export const BOT_AVATARS = [
  '🤖', '🦊', '🐯', '🦁', '🐻', '🐼', '🐲', '🦅',
  '🚀', '💎', '👑', '🧙‍♂️', '🥷', '🤠', '🦄', '🐆'
];

/**
 * Finds all possible valid combinations in a hand according to active rules.
 */
export function findAllPossibleCombos(hand: Card[], rules: GameRules = DEFAULT_RULES): HandCombo[] {
  const combos: HandCombo[] = [];
  const sortedHand = sortCards(hand, 'rank');

  // 1. Singles
  for (const card of sortedHand) {
    const combo = evaluateCombo([card], rules);
    if (combo) combos.push(combo);
  }

  // Group by rank for pairs, tris, four of a kind, and full house
  const rankGroups: Record<number, Card[]> = {};
  for (const card of sortedHand) {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  }

  // 2. Pairs
  const validPairs: { rank: number; cards: Card[] }[] = [];
  for (const cards of Object.values(rankGroups)) {
    if (cards.length >= 2) {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const combo = evaluateCombo([cards[i], cards[j]], rules);
          if (combo) {
            combos.push(combo);
            validPairs.push({ rank: cards[0].rank, cards: [cards[i], cards[j]] });
          }
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
            const combo = evaluateCombo([cards[i], cards[j], cards[k]], rules);
            if (combo) combos.push(combo);
          }
        }
      }
    }
  }

  // 4. Color Tris (3 cards of same suit and consecutive)
  const suitGroups: Record<string, Card[]> = {};
  for (const card of sortedHand) {
    if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
    suitGroups[card.suit].push(card);
  }

  if (rules.allowColorTris) {
    for (const suitCards of Object.values(suitGroups)) {
      if (suitCards.length >= 3) {
        // Try all 3-card combinations in suit
        for (let i = 0; i < suitCards.length; i++) {
          for (let j = i + 1; j < suitCards.length; j++) {
            for (let k = j + 1; k < suitCards.length; k++) {
              const combo = evaluateCombo([suitCards[i], suitCards[j], suitCards[k]], rules);
              if (combo && combo.type === 'COLOR_TRIS') {
                combos.push(combo);
              }
            }
          }
        }
      }
    }
  }

  // 5. Bong: Four of a Kind
  if (rules.allowBongFour) {
    for (const cards of Object.values(rankGroups)) {
      if (cards.length === 4) {
        const combo = evaluateCombo(cards, rules);
        if (combo) combos.push(combo);
      }
    }
  }

  // 6. Bong: 4-card Straight Flush
  if (rules.allowBongSF4) {
    for (const suitCards of Object.values(suitGroups)) {
      if (suitCards.length >= 4) {
        const sortedByRank = sortCards(suitCards, 'rank');
        for (let i = 0; i <= sortedByRank.length - 4; i++) {
          const slice = sortedByRank.slice(i, i + 4);
          const combo = evaluateCombo(slice, rules);
          if (combo && combo.type === 'BONG_SF') {
            combos.push(combo);
          }
        }
      }
    }
  }

  // 7. Brother (2 consecutive pairs - 4 cards)
  if (rules.allowBrother && validPairs.length >= 2) {
    for (let i = 0; i < validPairs.length; i++) {
      for (let j = i + 1; j < validPairs.length; j++) {
        const p1 = validPairs[i];
        const p2 = validPairs[j];
        if (p1.rank === p2.rank) continue;
        const combo = evaluateCombo([...p1.cards, ...p2.cards], rules);
        if (combo && combo.type === 'BROTHER') {
          combos.push(combo);
        }
      }
    }
  }

  // 8. Brother Panjang (3 consecutive pairs - 6 cards)
  if (rules.allowBrotherPanjang && validPairs.length >= 3) {
    for (let i = 0; i < validPairs.length; i++) {
      for (let j = i + 1; j < validPairs.length; j++) {
        for (let k = j + 1; k < validPairs.length; k++) {
          const p1 = validPairs[i];
          const p2 = validPairs[j];
          const p3 = validPairs[k];
          if (p1.rank === p2.rank || p2.rank === p3.rank || p1.rank === p3.rank) continue;
          const combo = evaluateCombo([...p1.cards, ...p2.cards, ...p3.cards], rules);
          if (combo && combo.type === 'BROTHER_PANJANG') {
            combos.push(combo);
          }
        }
      }
    }
  }

  // 9. Full House: 3 of one rank + 2 of another rank
  if (rules.allowFullHouse) {
    const triplets = Object.entries(rankGroups).filter(([_, cards]) => cards.length >= 3);
    const pairsOrBetter = Object.entries(rankGroups).filter(([_, cards]) => cards.length >= 2);

    for (const [tRankStr, tCards] of triplets) {
      const tRank = Number(tRankStr);
      const triplet = tCards.slice(0, 3);

      for (const [pRankStr, pCards] of pairsOrBetter) {
        const pRank = Number(pRankStr);
        if (pRank === tRank) continue;

        const pair = pCards.slice(0, 2);
        const combo = evaluateCombo([...triplet, ...pair], rules);
        if (combo) combos.push(combo);
      }
    }
  }

  // 10. Straight / Flush / Split / Straight Flush / Royal Flush (5 cards)
  if (rules.allowStraight || rules.allowFlush || rules.allowSplit || rules.allowStraightFlush5 || rules.allowRoyalFlush) {
    // 5-card suit-based combinations (Flush, SF, Royal Flush)
    for (const suitCards of Object.values(suitGroups)) {
      if (suitCards.length >= 5) {
        for (let i = 0; i < suitCards.length; i++) {
          for (let j = i + 1; j < suitCards.length; j++) {
            for (let k = j + 1; k < suitCards.length; k++) {
              for (let l = k + 1; l < suitCards.length; l++) {
                for (let m = l + 1; m < suitCards.length; m++) {
                  const five = [suitCards[i], suitCards[j], suitCards[k], suitCards[l], suitCards[m]];
                  const combo = evaluateCombo(five, rules);
                  if (combo) combos.push(combo);
                }
              }
            }
          }
        }
      }
    }

    // Straight (5 consecutive distinct ranks)
    if (rules.allowStraight) {
      const rankSet = new Set(sortedHand.map(c => c.rank));
      const possibleSequences: number[][] = [];

      // Normal sequences: 3..7 up to 10..14
      for (let start = 3; start <= 10; start++) {
        const seq = [start, start + 1, start + 2, start + 3, start + 4];
        if (seq.every(r => rankSet.has(r))) {
          possibleSequences.push(seq);
        }
      }

      // Low sequence A-2-3-4-5: ranks [3, 4, 5, 14, 15]
      if ([3, 4, 5, 14, 15].every(r => rankSet.has(r))) {
        possibleSequences.push([3, 4, 5, 14, 15]);
      }

      // Low sequence 2-3-4-5-6: ranks [3, 4, 5, 6, 15]
      if ([3, 4, 5, 6, 15].every(r => rankSet.has(r))) {
        possibleSequences.push([3, 4, 5, 6, 15]);
      }

      for (const seqRanks of possibleSequences) {
        const cardsPerRank = seqRanks.map(r => sortedHand.filter(c => c.rank === r));
        let straightCards = cardsPerRank.map(group => group[0]);

        if (straightCards.every(c => c.suit === straightCards[0].suit)) {
          // If all same suit, try to find an alternative card to form a mixed-suit straight
          for (let ri = 0; ri < cardsPerRank.length; ri++) {
            const alt = cardsPerRank[ri].find(c => c.suit !== straightCards[0].suit);
            if (alt) {
              const mixed = [...straightCards];
              mixed[ri] = alt;
              straightCards = mixed;
              break;
            }
          }
        }

        const combo = evaluateCombo(straightCards, rules);
        if (combo && combo.type === 'STRAIGHT') {
          combos.push(combo);
        }
      }
    }

    // Split: 3-card color + pair
    if (rules.allowSplit) {
      const colors3 = combos.filter(c => c.type === 'COLOR_TRIS');
      for (const col of colors3) {
        for (const p of validPairs) {
          // If disjoint cards
          const colIds = new Set(col.cards.map(c => c.id));
          if (!p.cards.some(c => colIds.has(c.id))) {
            const combo = evaluateCombo([...col.cards, ...p.cards], rules);
            if (combo && combo.type === 'SPLIT') {
              combos.push(combo);
            }
          }
        }
      }
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
  isFirstTurnOfGame: boolean,
  rules: GameRules = DEFAULT_RULES
): Card[] | null {
  const allCombos = findAllPossibleCombos(hand, rules);

  // Case 1: First turn of the entire game (MUST contain rank 3 / opening card)
  if (isFirstTurnOfGame) {
    let validFirstPlays = allCombos.filter(combo =>
      combo.cards.some(c => c.rank === 3)
    );

    if (rules.openingCard === '3D') {
      const with3D = validFirstPlays.filter(combo =>
        combo.cards.some(c => c.rank === 3 && c.suit === 'D')
      );
      if (with3D.length > 0) validFirstPlays = with3D;
    } else if (rules.openingCard === '3S') {
      const with3S = validFirstPlays.filter(combo =>
        combo.cards.some(c => c.isThreeSpades)
      );
      if (with3S.length > 0) validFirstPlays = with3S;
    }

    if (validFirstPlays.length === 0) {
      // Fallback: opening card
      const cardThree = (rules.openingCard === '3D' ? hand.find(c => c.rank === 3 && c.suit === 'D') : null) ||
        (rules.openingCard === '3S' ? hand.find(c => c.isThreeSpades) : null) ||
        hand.find(c => c.rank === 3);
      return cardThree ? [cardThree] : [hand[0]];
    }

    // Prefer leading with combo shedding more cards (5 cards > Tris > Pair > Single)
    const paketLead = validFirstPlays.find(c => c.cards.length === 5);
    if (paketLead) return paketLead.cards;

    const brotherLead = validFirstPlays.find(c => c.type === 'BROTHER');
    if (brotherLead) return brotherLead.cards;

    const trisLead = validFirstPlays.find(c => c.type === 'TRIS' || c.type === 'COLOR_TRIS');
    if (trisLead) return trisLead.cards;

    const pairLead = validFirstPlays.find(c => c.type === 'PAIR');
    if (pairLead) return pairLead.cards;

    // Single 3, preferring 3 Waru (3♠) or 3 Wajik (3♦)
    if (rules.openingCard === '3D') {
      const single3D = validFirstPlays.find(c => c.type === 'SINGLE' && c.cards.some(card => card.rank === 3 && card.suit === 'D'));
      if (single3D) return single3D.cards;
    } else if (rules.openingCard === '3S') {
      const single3S = validFirstPlays.find(c => c.type === 'SINGLE' && c.cards.some(card => card.isThreeSpades));
      if (single3S) return single3S.cards;
    }

    const single3 = validFirstPlays.find(c => c.type === 'SINGLE');
    if (single3) return single3.cards;

    return validFirstPlays[0].cards;
  }

  // Case 2: Free lead (lastPlay is null) - Player won the trick and starts new round
  if (!lastPlay) {
    // If entire hand forms a single valid combo (1 to 6 cards), dump them to win/clear!
    if (hand.length <= 6) {
      const direct = evaluateCombo(hand, rules);
      if (direct) return hand;
    }

    // Lead with smallest combos to shed lower cards
    // Priority: Low 5-card pakets, low brother, low tris, low pairs, low singles
    const nonPokerCombos = allCombos.filter(c => c.mainRank < 15);

    // Try low Full House / Straight
    const lowPaket = nonPokerCombos.find(c => (c.type === 'FULL_HOUSE' || c.type === 'STRAIGHT') && c.mainRank <= 9);
    if (lowPaket) return lowPaket.cards;

    // Try low tris (shedding 3 cards at once is highest tactical tempo)
    const lowTris = nonPokerCombos.find(c => (c.type === 'TRIS' || c.type === 'COLOR_TRIS') && c.mainRank <= 10);
    if (lowTris) return lowTris.cards;

    // Try low pair (rank <= 8)
    const lowPair = nonPokerCombos.find(c => c.type === 'PAIR' && c.mainRank <= 8);
    if (lowPair) return lowPair.cards;

    // Lowest single
    const lowSingle = nonPokerCombos.find(c => c.type === 'SINGLE');
    if (lowSingle) return lowSingle.cards;

    // If only poker/high combos left, play combo shedding maximum cards first
    if (allCombos.length > 0) {
      const sorted = [...allCombos].sort((a, b) => {
        if (a.mainRank !== b.mainRank) return a.mainRank - b.mainRank;
        return b.cards.length - a.cards.length;
      });
      return sorted[0].cards;
    }

    return [hand[0]];
  }

  // Case 3: Responding to table lastPlay
  const candidateCombos = allCombos.filter(c => canBeat(lastPlay.combo, c, rules));

  if (candidateCombos.length === 0) {
    return null; // Must pass
  }

  // If bot is down to 1-3 cards, play immediately to finish
  if (hand.length <= 3) {
    // If any candidate combo empties the entire hand, play it immediately to win!
    const finishingMove = candidateCombos.find(c => c.cards.length === hand.length);
    if (finishingMove) return finishingMove.cards;

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

  // If table is Single Ace (rank 14) and we have Full House, Tris, or Poker 2
  if (lastPlay.combo.mainRank === 14 && lastPlay.combo.type === 'SINGLE') {
    // Prefer Tris or Full House over wasting a 2
    const trisOrFH = candidateCombos.find(c => c.type === 'TRIS' || c.type === 'FULL_HOUSE');
    if (trisOrFH) return trisOrFH.cards;

    const pokerCounter = candidateCombos.find(
      c => c.type === 'SINGLE' && c.mainRank === 15
    );
    if (pokerCounter) return pokerCounter.cards;
  }

  // If table is Single Poker (2, rank 15) and we have Bong, Tris, or Full House
  if (lastPlay.combo.mainRank === 15 && lastPlay.combo.type === 'SINGLE') {
    const bong = candidateCombos.find(c => c.type === 'BONG_FOUR' || c.type === 'BONG_SF' || c.type === 'STRAIGHT_FLUSH');
    if (bong) {
      return bong.cards;
    }
    const trisOrFH = candidateCombos.find(c => c.type === 'TRIS' || c.type === 'FULL_HOUSE');
    if (trisOrFH) {
      return trisOrFH.cards;
    }
  }

  // Otherwise pick the lowest candidate combo
  candidateCombos.sort((a, b) => a.mainRank - b.mainRank);
  return candidateCombos[0].cards;
}
