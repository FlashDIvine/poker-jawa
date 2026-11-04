import { Player } from '@shared/types.js';
import { PlayingCard } from './PlayingCard.js';

interface PlayerSeatProps {
  player?: Player;
  isCurrentTurn: boolean;
  timeRemaining?: number;
  timeMax?: number;
  position: 'bottom' | 'left' | 'top' | 'right';
  isSelf?: boolean;
  isDealing?: boolean;
  isGamePlaying?: boolean;
  compact?: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  timeRemaining = 15,
  timeMax = 15,
  position,
  isSelf = false,
  isDealing = false,
  isGamePlaying = false,
  compact = false
}) => {
  if (!player) {
    if (isGamePlaying) return null;
    return (
      <div className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-dashed border-slate-700/60 bg-slate-900/40 text-slate-500 ${
        compact ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-24 h-24 sm:w-28 sm:h-28'
      }`}>
        <span className={compact ? 'text-lg' : 'text-2xl'}>🪑</span>
        <span className="text-[10px] sm:text-xs mt-0.5">Kosong</span>
      </div>
    );
  }

  const timerPercent = Math.max(0, Math.min(100, (timeRemaining / timeMax) * 100));

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 ${isSelf ? 'mb-2' : ''}`}>
      {/* Turn Timer Glow Ring & Avatar */}
      <div className="relative">
        {isCurrentTurn && (
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse opacity-90 blur-xs" />
        )}

        <div
          className={`relative rounded-full flex items-center justify-center shadow-lg border-2 ${
            compact
              ? 'w-9 h-9 sm:w-12 sm:h-12 text-base sm:text-xl landscape:w-8 landscape:h-8 landscape:sm:w-11 landscape:sm:h-11'
              : 'w-11 h-11 sm:w-16 sm:h-16 text-xl sm:text-3xl landscape:w-9 landscape:h-9 landscape:sm:w-13 landscape:sm:h-13'
          } ${
            isCurrentTurn
              ? 'border-yellow-300 bg-slate-900 shadow-amber-500/30'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          <span>{player.avatar}</span>

          {/* Host Crown */}
          {player.isHost && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm">👑</span>
          )}

          {/* Card Count Pill */}
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full shadow border border-slate-900">
            {player.cardCount}
          </div>
        </div>
      </div>

      {/* Name & Bot/Human tag */}
      <div className="mt-1 flex flex-col items-center max-w-[120px] text-center">
        <div className="flex items-center gap-1">
          <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
            {player.name}
          </span>
          {player.isBot && (
            <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.2 rounded">BOT</span>
          )}
        </div>

        {/* Turn Timer Bar */}
        {isCurrentTurn && (
          <div className="w-16 sm:w-20 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-1000 ${
                timerPercent > 40 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}

        {/* Finished / Winner Rank Badge */}
        {player.finishRank && (
          <span className="mt-1 bg-gradient-to-r from-amber-500 to-yellow-400 border border-yellow-200 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-md animate-bounce flex items-center gap-1 z-20">
            <span>{player.finishRank === 1 ? '🥇' : player.finishRank === 2 ? '🥈' : player.finishRank === 3 ? '🥉' : '🏁'}</span>
            <span>Juara {player.finishRank}</span>
          </span>
        )}

        {/* Pass Badge */}
        {!player.finishRank && player.passed && (
          <span className="mt-1 bg-rose-950/90 border border-rose-500/60 text-rose-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pass-knock flex items-center gap-1">
            <span>↷</span>
            <span>LEWAT</span>
          </span>
        )}
      </div>

      {/* Opponent Card Stack Fan (for non-self seats) */}
      {!isSelf && player.cardCount > 0 && (
        <div className={`hidden sm:flex items-center justify-center -space-x-8 mt-1 pointer-events-none scale-75 sm:scale-90 transition-all ${isDealing ? 'animate-deal-hand' : ''}`}>
          {Array.from({ length: Math.min(5, player.cardCount) }).map((_, i) => (
            <PlayingCard
              key={i}
              faceDown={true}
              size="sm"
              className="transform rotate-[calc((var(--i)-2)*6deg)]"
              style={{ '--i': i } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};
