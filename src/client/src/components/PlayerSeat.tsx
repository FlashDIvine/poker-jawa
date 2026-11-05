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
  isBooed?: boolean;
  onResumeControl?: () => void;
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
  compact = false,
  isBooed = false,
  onResumeControl
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

  const isSide = position === 'left' || position === 'right';

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 ${isSelf ? 'mb-2' : ''}`}>
      {/* Turn Timer Glow Ring & Avatar */}
      <div className="relative">
        {isCurrentTurn && (
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse opacity-90 blur-xs" />
        )}

        <div
          className={`relative rounded-full flex items-center justify-center shadow-lg border-2 compact-landscape-avatar ${
            compact || isSide
              ? 'w-8 h-8 xs:w-9 xs:h-9 sm:w-13 sm:h-13 text-base xs:text-lg sm:text-2xl landscape:w-8 landscape:h-8 landscape:sm:w-11 landscape:sm:h-11'
              : 'w-8 h-8 xs:w-9 xs:h-9 sm:w-16 sm:h-16 text-base xs:text-lg sm:text-3xl landscape:w-8 landscape:h-8 landscape:sm:w-13 landscape:sm:h-13'
          } ${
            isBooed
              ? 'border-red-500 bg-red-950/80 shadow-red-600/50 animate-boo-shake ring-2 ring-red-500/50'
              : isCurrentTurn
              ? 'border-yellow-300 bg-slate-900 shadow-amber-500/30'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          <span>{player.avatar}</span>

          {/* Host Crown */}
          {player.isHost && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs sm:text-sm">👑</span>
          )}

          {/* Card Count Pill */}
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] xs:text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full shadow border border-slate-900">
            {player.cardCount}
          </div>
        </div>
      </div>

      {/* Name & Bot/Human tag */}
      <div className={`mt-0.5 sm:mt-1 flex flex-col items-center text-center ${
        isSide ? 'max-w-[48px] xs:max-w-[58px] sm:max-w-[110px]' : 'max-w-[65px] xs:max-w-[85px] sm:max-w-[120px]'
      }`}>
        <div className="flex items-center gap-0.5 max-w-full justify-center">
          <span className={`font-semibold text-slate-200 truncate ${
            isSide
              ? 'text-[9px] xs:text-[10px] sm:text-xs max-w-[42px] xs:max-w-[50px] sm:max-w-[90px]'
              : 'text-[10px] sm:text-sm max-w-[52px] xs:max-w-[70px] sm:max-w-[100px]'
          }`}>
            {player.name}
          </span>
          {player.isBot ? (
            <span className="text-[7px] xs:text-[8px] sm:text-[9px] bg-slate-700 text-slate-300 px-0.5 py-0.2 rounded shrink-0">B</span>
          ) : player.isAutoPlay ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isSelf && onResumeControl) onResumeControl();
              }}
              className={`text-[7px] xs:text-[8px] sm:text-[9px] bg-purple-900/90 text-purple-200 border border-purple-500/50 px-1 py-0.2 rounded animate-pulse font-bold shrink-0 ${
                isSelf ? 'cursor-pointer hover:bg-purple-800' : ''
              }`}
              title={isSelf ? 'Mode Bot Aktif - Klik untuk Ambil Alih (ON)' : 'AFK: Dimainkan Otomatis oleh Bot'}
            >
              {isSelf ? '🤖 ON' : 'AFK'}
            </button>
          ) : isSelf && isGamePlaying ? (
            <span className="text-[7px] xs:text-[8px] sm:text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-1 py-0.2 rounded font-bold shrink-0" title="Pemain Aktif (Manual)">
              ON
            </span>
          ) : null}
        </div>

        {/* Turn Timer Bar */}
        {isCurrentTurn && (
          <div className={`${isSide ? 'w-8 xs:w-10 sm:w-16' : 'w-10 xs:w-12 sm:w-20'} bg-slate-800 rounded-full h-1 sm:h-1.5 mt-0.5 overflow-hidden border border-slate-700`}>
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
          isBooed ? (
            <span className="mt-0.5 bg-gradient-to-r from-red-600 to-rose-700 border border-red-300 text-white font-black text-[8px] xs:text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-full shadow-lg animate-bounce flex items-center gap-0.5 z-20 shrink-0 whitespace-nowrap">
              <span>👎</span>
              <span>#{player.finishRank}</span>
            </span>
          ) : (
            <span className="mt-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 border border-yellow-200 text-slate-950 font-black text-[8px] xs:text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-full shadow-md animate-bounce flex items-center gap-0.5 z-20 shrink-0 whitespace-nowrap">
              <span>{player.finishRank === 1 ? '🥇' : player.finishRank === 2 ? '🥈' : player.finishRank === 3 ? '🥉' : '🏁'}</span>
              <span>J{player.finishRank}</span>
            </span>
          )
        )}

        {/* Pass Badge */}
        {!player.finishRank && player.passed && (
          <span className="mt-0.5 bg-rose-950/90 border border-rose-500/60 text-rose-300 font-extrabold text-[8px] xs:text-[9px] px-1 sm:px-1.5 py-0.2 rounded-full shadow-sm animate-pass-knock flex items-center gap-0.5 shrink-0 whitespace-nowrap">
            <span>↷</span>
            <span>LEWAT</span>
          </span>
        )}
      </div>

      {/* Opponent Card Stack Fan (for non-self seats) */}
      {!isSelf && player.cardCount > 0 && (
        <div className={`hidden sm:flex compact-landscape-hide items-center justify-center -space-x-8 mt-1 pointer-events-none scale-75 sm:scale-90 transition-all ${isDealing ? 'animate-deal-hand' : ''}`}>
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
