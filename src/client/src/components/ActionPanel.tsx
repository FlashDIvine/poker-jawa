import React, { useState, useMemo } from 'react';
import { Card, PlayedTrick, GameRules, DEFAULT_RULES, HandCombo } from '@shared/types.js';
import { PlayingCard } from './PlayingCard.js';
import { validatePlay, evaluateCombo, canBeat } from '@shared/engine.js';
import { decideBotMove, findAllPossibleCombos } from '@shared/bot.js';
import { sortCards } from '@shared/deck.js';
import { ArrowUpDown, Lightbulb, X, Play, SkipForward } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

interface ActionPanelProps {
  hand: Card[];
  selectedCardIds: string[];
  onToggleCard: (cardId: string) => void;
  onSelectCards: (cardIds: string[]) => void;
  onClearSelection: () => void;
  onPlaySelected: () => void;
  onPass: () => void;
  onSortToggle: () => void;
  sortMode: 'rank' | 'suit';
  isMyTurn: boolean;
  lastPlay: PlayedTrick | null;
  isFirstTurnOfGame: boolean;
  isDealing?: boolean;
  rules?: GameRules;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  hand,
  selectedCardIds,
  onToggleCard,
  onSelectCards,
  onClearSelection,
  onPlaySelected,
  onPass,
  onSortToggle,
  sortMode,
  isMyTurn,
  lastPlay,
  isFirstTurnOfGame,
  isDealing = false,
  rules = DEFAULT_RULES
}) => {
  const [comboCycle, setComboCycle] = useState<Record<string, number>>({});

  const selectedCards = hand.filter(c => selectedCardIds.includes(c.id));
  const validation = selectedCards.length > 0
    ? validatePlay(selectedCards, lastPlay, isFirstTurnOfGame, rules)
    : { valid: false };

  const canPass = isMyTurn && !isFirstTurnOfGame && lastPlay !== null;

  // Auto-detect all combinations available in hand based on active rules
  const allCombos = useMemo(() => findAllPossibleCombos(hand, rules), [hand, rules]);

  const combosByType = useMemo(() => {
    const groups: Record<string, { label: string; cards: Card[]; mainRank: number; combo: HandCombo }[]> = {
      PAIR: [],
      TRIS: [],
      FULL_HOUSE: [],
      STRAIGHT: [],
      FLUSH: [],
      SPLIT: [],
      BROTHER: [],
      BROTHER_PANJANG: [],
      COLOR_TRIS: [],
      BONG: [],
      SINGLE: []
    };

    allCombos.forEach(combo => {
      const item = {
        label: combo.description,
        cards: combo.cards,
        mainRank: combo.mainRank,
        combo
      };

      if (combo.type === 'SINGLE') {
        groups.SINGLE.push(item);
      } else if (combo.type === 'PAIR') {
        groups.PAIR.push(item);
      } else if (combo.type === 'TRIS') {
        groups.TRIS.push(item);
      } else if (combo.type === 'FULL_HOUSE') {
        groups.FULL_HOUSE.push(item);
      } else if (combo.type === 'STRAIGHT') {
        groups.STRAIGHT.push(item);
      } else if (combo.type === 'FLUSH') {
        groups.FLUSH.push(item);
      } else if (combo.type === 'SPLIT') {
        groups.SPLIT.push(item);
      } else if (combo.type === 'BROTHER') {
        groups.BROTHER.push(item);
      } else if (combo.type === 'BROTHER_PANJANG') {
        groups.BROTHER_PANJANG.push(item);
      } else if (combo.type === 'COLOR_TRIS') {
        groups.COLOR_TRIS.push(item);
      } else if (
        combo.type === 'BONG_FOUR' ||
        combo.type === 'BONG_SF' ||
        combo.type === 'STRAIGHT_FLUSH' ||
        combo.type === 'ROYAL_FLUSH'
      ) {
        groups.BONG.push(item);
      }
    });

    return groups;
  }, [allCombos]);

  // Handler to select combos of a given type and cycle through them
  const handleSelectComboType = (type: string) => {
    sounds.playButtonClick();
    const group = combosByType[type] || [];
    if (group.length === 0) return;

    let candidateList = group;
    if (isMyTurn && lastPlay) {
      const winningList = group.filter(item => {
        return canBeat(lastPlay.combo, item.combo, rules);
      });
      if (winningList.length > 0) {
        candidateList = winningList;
      }
    } else if (isFirstTurnOfGame) {
      const openingCard = rules.openingCard;
      const openingList = group.filter(item => {
        if (openingCard === '3S') return item.cards.some(c => c.rank === 3 && c.suit === 'S');
        if (openingCard === '3D') return item.cards.some(c => c.rank === 3 && c.suit === 'D');
        return item.cards.some(c => c.rank === 3);
      });
      if (openingList.length > 0) {
        candidateList = openingList;
      }
    }

    const currentIdx = comboCycle[type] ?? 0;
    const selectedCombo = candidateList[currentIdx % candidateList.length];
    setComboCycle(prev => ({
      ...prev,
      [type]: (currentIdx + 1) % candidateList.length
    }));

    sounds.playCardSelect();
    onSelectCards(selectedCombo.cards.map(c => c.id));
  };

  const comboOptions = [
    { type: 'PAIR', label: 'Pair', icon: '👥', count: combosByType.PAIR.length, show: true },
    { type: 'TRIS', label: 'Tris', icon: '★', count: combosByType.TRIS.length, show: true },
    { type: 'FULL_HOUSE', label: 'Full House', icon: '👑', count: combosByType.FULL_HOUSE.length, show: rules.allowFullHouse },
    { type: 'STRAIGHT', label: 'Seri', icon: '📏', count: combosByType.STRAIGHT.length, show: rules.allowStraight },
    { type: 'FLUSH', label: 'Colour', icon: '🎨', count: combosByType.FLUSH.length, show: rules.allowFlush },
    { type: 'SPLIT', label: 'Split', icon: '⚡', count: combosByType.SPLIT.length, show: rules.allowSplit },
    { type: 'BROTHER', label: 'Brother', icon: '👯', count: combosByType.BROTHER.length, show: rules.allowBrother },
    { type: 'BROTHER_PANJANG', label: 'Brother Pjg', icon: '✨', count: combosByType.BROTHER_PANJANG.length, show: rules.allowBrotherPanjang },
    { type: 'COLOR_TRIS', label: 'Color Tris', icon: '🌈', count: combosByType.COLOR_TRIS.length, show: rules.allowColorTris },
    {
      type: 'BONG',
      label: 'Bong / SF',
      icon: '💣',
      count: combosByType.BONG.length,
      show: rules.allowBongFour || rules.allowBongSF4 || rules.allowStraightFlush5 || rules.allowRoyalFlush
    },
    { type: 'SINGLE', label: 'Satuan', icon: '♠', count: combosByType.SINGLE.length, show: true }
  ];

  // Auto-hint / suggestion handler
  const handleAutoHint = () => {
    sounds.playButtonClick();
    const suggested = decideBotMove(hand, lastPlay, isFirstTurnOfGame, rules);
    if (suggested && suggested.length > 0) {
      sounds.playCardSelect();
      onSelectCards(suggested.map(c => c.id));
    } else {
      sounds.playError();
    }
  };

  const handleCardClick = (cardId: string) => {
    sounds.playCardSelect();
    onToggleCard(cardId);
  };

  const handlePassClick = () => {
    sounds.playPass();
    onPass();
  };

  const handleSortClick = () => {
    sounds.playButtonClick();
    onSortToggle();
  };

  const handleClearClick = () => {
    sounds.playButtonClick();
    onClearSelection();
  };

  const handlePlayClick = () => {
    onPlaySelected();
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center px-1 sm:px-2 pb-0.5 sm:pb-2">
      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-3 mb-1 sm:mb-2 z-30">
        {/* Play Button */}
        <button
          onClick={handlePlayClick}
          disabled={!isMyTurn || !validation.valid}
          className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-base shadow-lg transition-all duration-200 ${
            isMyTurn && validation.valid
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 scale-105 active:scale-95 cursor-pointer ring-2 ring-yellow-300'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          <span>Keluarkan ({selectedCardIds.length})</span>
        </button>

        {/* Pass Button */}
        <button
          onClick={handlePassClick}
          disabled={!canPass}
          className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-base shadow transition-all duration-200 ${
            canPass
              ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-500/50 active:scale-95 cursor-pointer'
              : 'bg-slate-800/60 text-slate-600 border border-slate-800 cursor-not-allowed'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Lewat</span>
        </button>

        {/* Suggestion / Hint Button */}
        {isMyTurn && (
          <button
            onClick={handleAutoHint}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-semibold text-[11px] sm:text-sm bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 shadow cursor-pointer transition-all active:scale-95"
            title="Beri saran kombinasi yang bisa dikeluarkan"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
            <span>Saran</span>
          </button>
        )}

        {/* Sort Toggle Button */}
        <button
          onClick={handleSortClick}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-semibold text-[11px] sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow cursor-pointer transition-all active:scale-95"
          title="Ubah urutan kartu berdasarkan Angka atau Kembang"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>Urut: {sortMode === 'rank' ? 'Angka' : 'Kembang'}</span>
        </button>

        {/* Reset Selection Button */}
        {selectedCardIds.length > 0 && (
          <button
            onClick={handleClearClick}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer transition-all active:scale-95"
            title="Batalkan pilihan kartu"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Batal</span>
          </button>
        )}
      </div>

      {/* Quick Combination Selector Row (Pair, Full House, Tris, Bong, Satuan) */}
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2 z-30">
        <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:inline mr-1">
          Pilih Kombinasi:
        </span>
        {comboOptions.filter(opt => opt.count > 0).map(opt => (
          <button
            key={opt.type}
            onClick={() => handleSelectComboType(opt.type)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95 cursor-pointer bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-300 hover:shadow-amber-500/20"
            title={`Pilih ${opt.label} (${opt.count} tersedia di tangan)`}
          >
            <span className="text-xs sm:text-sm">{opt.icon}</span>
            <span>{opt.label}</span>
            <span className="px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Combo Feedback Hint */}
      {selectedCards.length > 0 && (
        <div className="mb-1 text-[11px] sm:text-xs font-medium px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-900/80 border border-slate-700 shadow flex items-center gap-1.5">
          {validation.valid ? (
            <span className="text-emerald-400 flex items-center gap-1">
              ✓ {validation.combo?.description}
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1">
              ✕ {validation.error || 'Kombinasi tidak valid'}
            </span>
          )}
        </div>
      )}

      {/* Hand Cards Horizontal Display (with clean spacing and non-occluding z-index) */}
      <div className="w-full overflow-x-auto py-1 sm:py-3 px-1 sm:px-2 flex justify-start sm:justify-center items-end min-h-[75px] sm:min-h-[110px] scrollbar-thin">
        <div className="flex items-end -space-x-4 sm:-space-x-4 px-2 sm:px-4">
          {hand.map((card, idx) => {
            const isSelected = selectedCardIds.includes(card.id);
            // Non-occluding stacking: card idx+1 is always above card idx on the right side
            const cardZIndex = idx * 2 + (isSelected ? 1 : 0);

            return (
              <div
                key={card.id}
                style={{
                  zIndex: cardZIndex,
                  animationDelay: isDealing ? `${idx * 40}ms` : undefined
                }}
                className={`transition-all duration-150 ${isDealing ? 'animate-deal-hand' : ''}`}
              >
                <PlayingCard
                  card={card}
                  selected={isSelected}
                  onClick={() => handleCardClick(card.id)}
                  size="md"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
