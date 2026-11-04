import { Card, PlayedTrick } from '@shared/types.js';
import { PlayingCard } from './PlayingCard.js';
import { validatePlay, evaluateCombo } from '@shared/engine.js';
import { decideBotMove } from '@shared/bot.js';
import { ArrowUpDown, Lightbulb, X, Play, SkipForward } from 'lucide-react';

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
  isFirstTurnOfGame
}) => {
  const selectedCards = hand.filter(c => selectedCardIds.includes(c.id));
  const validation = selectedCards.length > 0
    ? validatePlay(selectedCards, lastPlay, isFirstTurnOfGame)
    : { valid: false };

  const canPass = isMyTurn && !isFirstTurnOfGame && lastPlay !== null;

  // Auto-hint / suggestion handler
  const handleAutoHint = () => {
    const suggested = decideBotMove(hand, lastPlay, isFirstTurnOfGame);
    if (suggested && suggested.length > 0) {
      onSelectCards(suggested.map(c => c.id));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center px-2 pb-2">
      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-3 z-30">
        {/* Play Button */}
        <button
          onClick={onPlaySelected}
          disabled={!isMyTurn || !validation.valid}
          className={`flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-sm sm:text-base shadow-lg transition-all duration-200 ${
            isMyTurn && validation.valid
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 scale-105 active:scale-95 cursor-pointer ring-2 ring-yellow-300'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Keluarkan ({selectedCardIds.length})</span>
        </button>

        {/* Pass Button */}
        <button
          onClick={onPass}
          disabled={!canPass}
          className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-sm sm:text-base shadow transition-all duration-200 ${
            canPass
              ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-500/50 active:scale-95 cursor-pointer'
              : 'bg-slate-800/60 text-slate-600 border border-slate-800 cursor-not-allowed'
          }`}
        >
          <SkipForward className="w-4 h-4" />
          <span>Lewat</span>
        </button>

        {/* Suggestion / Hint Button */}
        {isMyTurn && (
          <button
            onClick={handleAutoHint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 shadow cursor-pointer transition-all active:scale-95"
            title="Beri saran kombinasi yang bisa dikeluarkan"
          >
            <Lightbulb className="w-4 h-4 text-amber-300" />
            <span>Saran</span>
          </button>
        )}

        {/* Sort Toggle Button */}
        <button
          onClick={onSortToggle}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow cursor-pointer transition-all active:scale-95"
          title="Ubah urutan kartu berdasarkan Angka atau Kembang"
        >
          <ArrowUpDown className="w-4 h-4 text-emerald-400" />
          <span>Urutkan: {sortMode === 'rank' ? 'Angka' : 'Kembang'}</span>
        </button>

        {/* Reset Selection Button */}
        {selectedCardIds.length > 0 && (
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer transition-all"
            title="Batalkan pilihan kartu"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>
        )}
      </div>

      {/* Selected Combo Feedback Hint */}
      {selectedCards.length > 0 && (
        <div className="mb-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 shadow flex items-center gap-2">
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

      {/* Hand Cards Horizontal Display */}
      <div className="w-full overflow-x-auto py-4 px-2 flex justify-start sm:justify-center items-end min-h-[110px] scrollbar-thin">
        <div className="flex items-end -space-x-5 sm:-space-x-7 px-4">
          {hand.map((card, idx) => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <div
                key={card.id}
                style={{ zIndex: isSelected ? 40 : idx + 1 }}
                className="transition-all duration-150"
              >
                <PlayingCard
                  card={card}
                  selected={isSelected}
                  onClick={() => onToggleCard(card.id)}
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
