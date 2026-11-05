import React, { useState, useMemo } from 'react';
import { Card, PlayedTrick, GameRules, DEFAULT_RULES, HandCombo, Player } from '@shared/types.js';
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
  player?: Player;
  turnTimeRemaining?: number;
  turnTimerMax?: number;
  onResumeControl?: () => void;
  hintsEnabled?: boolean;
  onToggleHints?: () => void;
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
  rules = DEFAULT_RULES,
  player,
  turnTimeRemaining = 15,
  turnTimerMax = 15,
  onResumeControl,
  hintsEnabled = true,
  onToggleHints
}) => {
  const [comboCycle, setComboCycle] = useState<Record<string, number>>({});

  const selectedCards = hand.filter(c => selectedCardIds.includes(c.id));
  const validation = selectedCards.length > 0
    ? validatePlay(selectedCards, lastPlay, isFirstTurnOfGame, rules)
    : { valid: false };

  const canPass = isMyTurn && !isFirstTurnOfGame && lastPlay !== null;

  const isPokerSuicideMove = useMemo(() => {
    if (rules.holdingPokerAsLastCardLoses === false || selectedCards.length === 0 || !validation.valid) {
      return false;
    }
    const finishesWithPoker = hand.length === selectedCards.length && selectedCards.some(c => c.isPoker || c.rank === 15);
    const remaining = hand.filter(c => !selectedCardIds.includes(c.id));
    const leavesOnlyPoker = remaining.length > 0 && remaining.every(c => c.isPoker || c.rank === 15);
    return finishesWithPoker || leavesOnlyPoker;
  }, [hand, selectedCards, selectedCardIds, validation.valid, rules.holdingPokerAsLastCardLoses]);

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
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
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
      if (rules?.discardThrees) {
        candidateList = group;
      } else {
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
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
    sounds.playButtonClick();
    if (!isMyTurn) return;
    const suggested = decideBotMove(hand, lastPlay, isFirstTurnOfGame, rules);
    if (suggested && suggested.length > 0) {
      sounds.playCardSelect();
      onSelectCards(suggested.map(c => c.id));
    } else {
      sounds.playError();
    }
  };

  const handleCardClick = (cardId: string) => {
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
    sounds.playCardSelect();
    onToggleCard(cardId);
  };

  const handlePassClick = () => {
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
    if (canPass) {
      sounds.playPass();
      onPass();
    }
  };

  const handleSortClick = () => {
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
    sounds.playButtonClick();
    onSortToggle();
  };

  const handleClearClick = () => {
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
    sounds.playButtonClick();
    onClearSelection();
  };

  const handlePlayClick = () => {
    if (player?.isAutoPlay && onResumeControl) {
      onResumeControl();
    }
    if (isMyTurn && validation.valid) {
      onPlaySelected();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center px-1 sm:px-2 pb-0.5">
      {/* AFK Auto-play Takeover Notification Banner (Desktop helper; on mobile top toast is used to maximize felt space) */}
      {player?.isAutoPlay && (
        <div
          onClick={onResumeControl}
          className="hidden sm:flex w-full max-w-xl bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-purple-950/95 border border-purple-400 rounded-xl px-2.5 py-1 mb-1 items-center justify-between text-xs text-purple-200 shadow-xl cursor-pointer active:scale-98 transition-all landscape:py-0.5 landscape:px-2 landscape:text-[10px] landscape:mb-0.5"
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base sm:text-lg">🤖</span>
            <div className="flex flex-col text-left">
              <span className="font-bold text-amber-300 text-[11px] sm:text-xs">Mode Bot Aktif (AFK)</span>
              <span className="text-[10px] sm:text-[11px] text-purple-200">Kartu Anda dimainkan otomatis oleh AI. Ketuk untuk kembali manual (ON).</span>
            </div>
          </div>
          {onResumeControl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResumeControl();
              }}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-[11px] sm:text-xs shadow-md transition-all active:scale-95 cursor-pointer ml-2 shrink-0"
            >
              Ambil Alih Sekarang (ON)
            </button>
          )}
        </div>
      )}

      {/* Top Helper Strip: Mini Player Profile & Quick Combo Selection Chips */}
      <div className="w-full flex items-center justify-between gap-1 sm:gap-2 mb-1 z-20 px-1 min-w-0">
        {/* Mini Player Profile Tag */}
        {player && (
          <div
            className={`shrink-0 compact-hide-profile flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-xl border transition-all ${
              isMyTurn
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span className="text-sm sm:text-base">{player.avatar}</span>
              {player.isHost && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px]">👑</span>
              )}
              {isMyTurn && (
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] px-1 rounded-full animate-pulse">
                  {turnTimeRemaining}s
                </span>
              )}
            </div>
            <div className="hidden xs:flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold truncate max-w-[65px]">
                  {player.name}
                </span>
                {player.isAutoPlay ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onResumeControl) onResumeControl();
                    }}
                    className="text-[8px] sm:text-[9px] bg-purple-900/90 hover:bg-purple-800 text-purple-200 border border-purple-500/50 px-1.5 py-0.2 rounded font-bold animate-pulse cursor-pointer"
                    title="Mode Bot Aktif - Klik untuk Ambil Alih (ON)"
                  >
                    🤖 AFK (Klik ON)
                  </button>
                ) : (
                  <span className="text-[8px] sm:text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded font-bold">
                    🟢 ON
                  </span>
                )}
              </div>
              <span className="text-[9px] text-amber-400 font-medium">
                {player.cardCount} kartu
              </span>
            </div>
          </div>
        )}

        {/* Quick Combo Scrollable Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 mx-auto flex-1 min-w-0 justify-center sm:justify-end">
          {comboOptions.filter(opt => opt.count > 0).map(opt => (
            <button
              key={opt.type}
              onClick={() => handleSelectComboType(opt.type)}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400"
              title={`Pilih ${opt.label} (${opt.count} tersedia di tangan)`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 font-bold">
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hand Cards Horizontal Display */}
      <div
        onClick={() => {
          if (player?.isAutoPlay && onResumeControl) {
            onResumeControl();
          }
        }}
        className="relative w-full overflow-x-auto pt-6 sm:pt-7 landscape:pt-4 pb-1.5 landscape:pb-0.5 px-2 flex justify-start sm:justify-center items-end min-h-[76px] sm:min-h-[105px] landscape:min-h-[64px] landscape:sm:min-h-[68px] scrollbar-thin shrink-0 z-10 isolate"
      >
        <div className={`flex items-end px-2 sm:px-4 ${
          hand.length > 14
            ? '-space-x-5.5 xs:-space-x-5 sm:-space-x-4'
            : hand.length > 8
            ? '-space-x-5 xs:-space-x-4 sm:-space-x-4'
            : '-space-x-4 sm:-space-x-4'
        }`}>
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


      {/* Ergonomic Dedicated Thumb-Friendly Bottom Action Bar */}
      <div className="relative w-full flex items-center justify-between gap-1 sm:gap-2.5 py-1 sm:py-1.5 px-1.5 sm:px-2 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] z-30 max-w-4xl shrink-0 bg-slate-900/90 sm:bg-slate-900/50 backdrop-blur-md rounded-t-2xl sm:rounded-2xl border-t border-slate-700/60 sm:border border-slate-700/40 shadow-xl mt-0.5">
        {/* Left Thumb Cluster: Pass, Hint, Sort */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Pass Button */}
          <button
            onClick={handlePassClick}
            disabled={!player?.isAutoPlay && !canPass}
            className={`flex items-center justify-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm shadow transition-all duration-150 active:scale-95 ${
              player?.isAutoPlay
                ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-500/60 cursor-pointer shadow-rose-950/40 ring-1 ring-rose-500/50'
                : canPass
                ? 'bg-rose-900/90 hover:bg-rose-800 text-rose-100 border border-rose-500/60 cursor-pointer shadow-rose-950/40 ring-1 ring-rose-500/50'
                : 'bg-slate-800/60 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <SkipForward className="w-3.5 h-3.5 shrink-0" />
            <span>Lewat</span>
          </button>

          {/* Suggestion / Hint Button (Toggleable on mobile or hidden in room-level No-Hint Mode) */}
          {rules?.allowHints !== false && (
            hintsEnabled ? (
              <button
                onClick={handleAutoHint}
                disabled={!player?.isAutoPlay && !isMyTurn}
                className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl font-semibold text-xs transition-all active:scale-95 ${
                  player?.isAutoPlay || isMyTurn
                    ? 'bg-indigo-900/90 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/50 shadow cursor-pointer ring-1 ring-indigo-400/40'
                    : 'bg-slate-800/60 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
                title="Beri saran kombinasi yang bisa dikeluarkan"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden xs:inline">Saran</span>
              </button>
            ) : onToggleHints ? (
              <button
                onClick={onToggleHints}
                className="flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl font-medium text-xs bg-slate-900 hover:bg-slate-800 text-slate-500 border border-slate-700/80 cursor-pointer transition-all active:scale-95"
                title="Mode Tanpa Saran aktif. Klik untuk nyalakan bantuan saran."
              >
                <Lightbulb className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-[11px] text-slate-400">Off</span>
              </button>
            ) : null
          )}

          {/* Sort Button */}
          <button
            onClick={handleSortClick}
            className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow cursor-pointer transition-all active:scale-95"
            title="Ubah urutan kartu"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{sortMode === 'rank' ? 'Angka' : 'Kembang'}</span>
            <span className="sm:hidden text-[10px]">{sortMode === 'rank' ? '123' : '♠♥'}</span>
          </button>
        </div>

        {/* Right Thumb Cluster: Cancel Selection & Primary Play Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Cancel Selection Button */}
          {selectedCardIds.length > 0 && (
            <button
              onClick={handleClearClick}
              className="flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-all active:scale-95"
              title="Batalkan pilihan kartu"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* Primary Play Button */}
          <button
            onClick={handlePlayClick}
            disabled={!player?.isAutoPlay && (!isMyTurn || !validation.valid)}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all duration-150 active:scale-95 ${
              player?.isAutoPlay
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 cursor-pointer ring-2 ring-yellow-300 animate-pulse'
                : isMyTurn && validation.valid
                ? isPokerSuicideMove
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-600/30 cursor-pointer ring-2 ring-red-400 scale-102 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 cursor-pointer ring-2 ring-yellow-300 scale-102'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="truncate max-w-[80px] xs:max-w-[140px] sm:max-w-none">
              {player?.isAutoPlay
                ? 'Ambil Alih (ON)'
                : isPokerSuicideMove
                ? 'Keluarkan (⚠️ Kalah Instan!)'
                : validation.valid && validation.combo
                ? `Keluarkan (${validation.combo.description})`
                : selectedCardIds.length > 0
                ? `Keluarkan (${selectedCardIds.length})`
                : 'Keluarkan'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
