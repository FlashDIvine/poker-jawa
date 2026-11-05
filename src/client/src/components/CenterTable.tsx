import React, { useMemo } from 'react';
import { PlayedTrick } from '@shared/types.js';
import { PlayingCard } from './PlayingCard.js';

interface CenterTableProps {
  lastPlay: PlayedTrick | null;
  isFirstTurnOfGame: boolean;
  leadPlayerName?: string;
  playedFrom?: 'bottom' | 'left' | 'top' | 'right';
  isDealing?: boolean;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  lastPlay,
  isFirstTurnOfGame,
  leadPlayerName,
  playedFrom = 'bottom',
  isDealing = false
}) => {
  if (isDealing) {
    return (
      <div className="relative flex flex-col items-center justify-center py-2 sm:py-5 px-3 sm:px-4 rounded-xl sm:rounded-3xl bg-emerald-950/40 border border-amber-500/30 text-center backdrop-blur-sm min-h-[110px] sm:min-h-[160px] min-w-[170px] xs:min-w-[200px] sm:min-w-[240px] max-w-full">
        {/* Animated Flying Cards to 4 seats */}
        <div className="relative w-14 h-18 sm:w-16 sm:h-20 mb-2 sm:mb-3 flex items-center justify-center">
          {/* Base Deck Stack */}
          <div className="absolute inset-0 bg-slate-900 border border-amber-500/40 rounded-lg shadow-lg rotate-1 scale-95" />
          <div className="absolute inset-0 bg-slate-900 border border-amber-500/40 rounded-lg shadow-md -rotate-1 scale-98" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 border border-amber-400/60 rounded-lg shadow-xl flex items-center justify-center">
            <span className="text-amber-400 font-serif-poker text-base sm:text-lg">♠</span>
          </div>

          {/* Flying Cards towards 4 Seats */}
          <div className="absolute left-1/2 top-1/2 w-8 h-12 sm:w-10 sm:h-14 bg-amber-500/90 border border-white/60 rounded-md shadow-md animate-deal-bottom pointer-events-none" />
          <div className="absolute left-1/2 top-1/2 w-8 h-12 sm:w-10 sm:h-14 bg-amber-500/90 border border-white/60 rounded-md shadow-md animate-deal-left pointer-events-none" />
          <div className="absolute left-1/2 top-1/2 w-8 h-12 sm:w-10 sm:h-14 bg-amber-500/90 border border-white/60 rounded-md shadow-md animate-deal-top pointer-events-none" />
          <div className="absolute left-1/2 top-1/2 w-8 h-12 sm:w-10 sm:h-14 bg-amber-500/90 border border-white/60 rounded-md shadow-md animate-deal-right pointer-events-none" />
        </div>

        <span className="text-amber-300 font-bold text-xs sm:text-sm animate-pulse tracking-wide">
          Membagikan Kartu...
        </span>
        <span className="text-[10px] sm:text-[11px] text-emerald-200/60 mt-0.5">
          Kartu dibagikan rata ke semua pemain di meja
        </span>
      </div>
    );
  }

  if (!lastPlay) {
    return (
      <div className="flex flex-col items-center justify-center py-1 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-center min-h-[75px] sm:min-h-[140px] min-w-[170px] xs:min-w-[200px] sm:min-w-[240px] max-w-full">
        {isFirstTurnOfGame ? (
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-xl sm:text-3xl mb-0.5 sm:mb-1 text-amber-400">♠</span>
            <span className="text-amber-400 font-bold text-xs sm:text-base">
              Langkah Pembuka Permainan
            </span>
            <p className="text-emerald-200/80 text-[10px] sm:text-xs mt-0.5 max-w-[240px]">
              Semua angka 3 telah dibuang! Pemegang <strong className="text-amber-300">3♠</strong> memimpin langkah pertama.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fadeIn">
            <span className="text-lg sm:text-2xl mb-0.5 opacity-80 text-amber-400">🎴</span>
            <span className="text-amber-300 font-semibold text-xs sm:text-sm">
              Meja Bersih (Giliran Bebas)
            </span>
            {leadPlayerName && (
              <span className="text-emerald-200/70 text-[10px] sm:text-xs mt-0.5">
                {leadPlayerName} memimpin putaran baru
              </span>
            )}
            <p className="hidden xs:block text-slate-400 text-[10px] sm:text-[11px] mt-0.5">
              Bebas keluarkan kombinasi yang sah sesuai aturan meja.
            </p>
          </div>
        )}
      </div>
    );
  }

  const { combo, playerName, timestamp } = lastPlay;
  const isBong = combo.type === 'BONG_FOUR' || combo.type === 'BONG_SF';
  const isTris = combo.type === 'TRIS';
  const isFullHouse = combo.type === 'FULL_HOUSE';
  const isPoker = combo.cards.some(c => c.isPoker);
  const isAce = combo.cards.some(c => c.isAce);
  const isHeavyPlay = isBong || isPoker || isTris || isFullHouse;

  // Natural subtle card tilt angles for organic casino felt look
  const tiltAngles = useMemo(() => [-3.5, 2.5, -1.5, 3.5, -2], []);
  const placementAnimation = `animate-card-place-${playedFrom}`;

  return (
    <div
      key={`trick_${timestamp}`}
      className={`relative flex flex-col items-center justify-center p-1 sm:p-2.5 rounded-xl sm:rounded-2xl min-h-[80px] sm:min-h-[140px] transition-all ${
        isHeavyPlay ? 'animate-rumble' : ''
      }`}
    >
      {/* Visual Shockwave Ripple on Card Placement */}
      <div
        key={`impact_${timestamp}`}
        className="absolute inset-0 m-auto w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-amber-400/50 pointer-events-none animate-felt-impact"
      />

      {/* Played By & Combo Title */}
      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 z-10 max-w-full px-1">
        <span className="text-[10px] sm:text-xs text-slate-200 truncate max-w-full drop-shadow-sm">
          <strong className="text-amber-300 font-semibold">{playerName}</strong> mengeluarkan:
        </span>
      </div>

      {/* Cards in Center with Directional Placement Animation (Naruh Kartu Sampe Ke Meja) */}
      <div
        key={`cards_container_${timestamp}`}
        className="flex items-center justify-center -space-x-5 xs:-space-x-4 sm:-space-x-6 my-0.5 sm:my-1 transition-all z-10 max-w-full px-1 overflow-hidden"
      >
        {combo.cards.map((card, idx) => {
          const rot = tiltAngles[idx % tiltAngles.length];
          const delayClass = `slam-delay-${Math.min(idx, 4)}`;

          return (
            <div
              key={card.id}
              className={`${placementAnimation} ${delayClass}`}
              style={{
                zIndex: idx + 10,
                ['--card-rot' as any]: `${rot}deg`
              }}
            >
              <div className="transform transition-transform duration-200 hover:-translate-y-2 hover:scale-105 cursor-default">
                <PlayingCard card={card} size="md" disabled={true} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Combination Badge & Special Tag */}
      <div className="mt-1 sm:mt-2 flex items-center gap-1.5 z-10 animate-badge-pop max-w-full px-1">
        <div
          className={`px-2.5 sm:px-3.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold shadow-lg border flex items-center gap-1.5 truncate max-w-full ${
            isBong
              ? 'bg-rose-600/95 border-rose-300 text-white shadow-rose-500/40'
              : isPoker
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-yellow-200 text-slate-950 shadow-amber-500/40'
              : isTris
              ? 'bg-emerald-600/95 border-emerald-300 text-white shadow-emerald-500/40'
              : isFullHouse
              ? 'bg-purple-600/95 border-purple-300 text-white shadow-purple-500/40'
              : isAce
              ? 'bg-indigo-600/95 border-indigo-300 text-white shadow-indigo-500/40'
              : 'bg-slate-800/90 border-slate-600 text-slate-200'
          }`}
        >
          {isBong && <span>💣</span>}
          {isPoker && <span>🔥</span>}
          {isTris && <span>★</span>}
          {isFullHouse && <span>👑</span>}
          <span className="truncate">{combo.description}</span>
        </div>
      </div>
    </div>
  );
};
