import { PlayedTrick } from '@shared/types.js';
import { PlayingCard } from './PlayingCard.js';

interface CenterTableProps {
  lastPlay: PlayedTrick | null;
  isFirstTurnOfGame: boolean;
  leadPlayerName?: string;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  lastPlay,
  isFirstTurnOfGame,
  leadPlayerName
}) => {
  if (!lastPlay) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-emerald-950/20 border border-emerald-500/20 text-center backdrop-blur-xs min-h-[160px] min-w-[240px]">
        {isFirstTurnOfGame ? (
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-3xl mb-1">♠</span>
            <span className="text-amber-400 font-bold text-sm sm:text-base">
              Langkah Pembuka Permainan
            </span>
            <p className="text-emerald-200/70 text-xs mt-1 max-w-[200px]">
              Pemain dengan <strong className="text-amber-300">3 Waru (3♠)</strong> wajib memulai dan mengeluarkan kombinasi yang memuat 3♠!
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1 opacity-60">🃏</span>
            <span className="text-amber-300 font-semibold text-sm">
              Meja Bersih (Giliran Bebas)
            </span>
            {leadPlayerName && (
              <span className="text-emerald-200/60 text-xs mt-0.5">
                {leadPlayerName} memimpin putaran baru
              </span>
            )}
            <p className="text-slate-400 text-[11px] mt-1">
              Bebas keluarkan Satuan, Pair, Tris, Bong, atau Full House.
            </p>
          </div>
        )}
      </div>
    );
  }

  const { combo, playerName } = lastPlay;
  const isBong = combo.type === 'BONG_FOUR' || combo.type === 'BONG_SF';
  const isPoker = combo.cards.some(c => c.isPoker);
  const isAce = combo.cards.some(c => c.isAce);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl bg-slate-950/40 border border-amber-500/30 backdrop-blur-sm min-h-[160px] shadow-2xl transition-all">
      {/* Played By & Combo Title */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-300">
          <strong className="text-amber-300 font-semibold">{playerName}</strong> mengeluarkan:
        </span>
      </div>

      {/* Cards in Center */}
      <div className="flex items-center justify-center -space-x-4 sm:-space-x-6 my-1 transition-all">
        {combo.cards.map((card, idx) => (
          <div
            key={card.id}
            className="transform transition-transform hover:-translate-y-2"
            style={{ zIndex: idx + 10 }}
          >
            <PlayingCard card={card} size="md" disabled={true} />
          </div>
        ))}
      </div>

      {/* Combination Badge */}
      <div className="mt-2 flex items-center gap-1.5">
        <div
          className={`px-3 py-0.5 rounded-full text-xs font-bold shadow-md border ${
            isBong
              ? 'bg-rose-600/90 border-rose-400 text-white animate-bounce'
              : isPoker
              ? 'bg-amber-600/90 border-yellow-300 text-slate-950'
              : isAce
              ? 'bg-indigo-600/90 border-indigo-400 text-white'
              : 'bg-slate-800/90 border-slate-600 text-slate-200'
          }`}
        >
          {combo.description}
        </div>
      </div>
    </div>
  );
};
