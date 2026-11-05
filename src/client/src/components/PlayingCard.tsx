import { Card } from '@shared/types.js';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  selected = false,
  onClick,
  size = 'md',
  className = '',
  style,
  disabled = false
}) => {
  const sizeClasses = {
    xs: 'w-6 h-8.5 sm:w-8 sm:h-11 text-[8px] sm:text-[10px] rounded-sm',
    sm: 'w-7 h-10 sm:w-10 sm:h-14 text-[9px] sm:text-xs rounded-md',
    md: 'w-10 h-[56px] sm:w-16 sm:h-24 text-[11px] sm:text-base rounded-lg landscape:w-9.5 landscape:h-[52px] landscape:sm:w-10 landscape:sm:h-[54px] lg:landscape:w-15 lg:landscape:h-22 landscape:text-[10px] lg:landscape:text-base',
    lg: 'w-14 h-20 sm:w-20 sm:h-28 text-sm sm:text-lg rounded-xl'
  };

  if (faceDown || !card || card.rankLabel === '?') {
    return (
      <div
        className={`relative select-none border border-slate-700/60 shadow-md transition-all duration-200 ${sizeClasses[size]} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          backgroundImage: 'radial-gradient(#334155 1.5px, transparent 1.5px)',
          backgroundSize: '8px 8px',
          ...style
        }}
      >
        <div className="absolute inset-1 border border-amber-500/20 rounded flex items-center justify-center">
          <span className="text-amber-500/40 text-xs font-serif-poker">♠</span>
        </div>
      </div>
    );
  }

  const isRed = card.color === 'red';
  const textColor = isRed ? 'text-red-600' : 'text-slate-900';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`relative select-none bg-gradient-to-b from-white via-slate-50 to-slate-100 border transition-all duration-200 card-shadow ${
        sizeClasses[size]
      } ${
        selected
          ? 'card-selected border-amber-400'
          : 'border-slate-300 hover:border-amber-300 card-hover cursor-pointer'
      } ${disabled ? 'opacity-75 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`absolute top-0.5 left-1 sm:top-1 sm:left-1.5 landscape:top-0.5 landscape:left-0.5 flex flex-col items-center leading-none font-bold ${textColor}`}>
        <span className="tracking-tighter">{card.rankLabel}</span>
        <span className="text-[10px] sm:text-xs landscape:text-[9px] -mt-0.5">{card.suitSymbol}</span>
      </div>

      {/* Special Badges (Poker 2, Ace As, 3 Waru) */}
      {card.isThreeSpades && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-[8px] px-1 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 z-20">
          <span>★</span>
          <span>3♠</span>
        </div>
      )}

      {card.isPoker && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-[8px] px-1 py-0.5 rounded-full shadow-sm z-20 animate-pulse">
          POKER
        </div>
      )}

      {card.isAce && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-extrabold text-[8px] px-1 py-0.5 rounded-full shadow-sm z-20">
          AS
        </div>
      )}

      {/* Center Large Suit Symbol */}
      <div className={`absolute inset-0 flex items-center justify-center font-serif-poker opacity-85 pointer-events-none ${textColor}`}>
        <span className={`${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-xl sm:text-3xl landscape:text-lg lg:landscape:text-3xl' : 'text-3xl sm:text-4xl'}`}>
          {card.suitSymbol}
        </span>
      </div>

      {/* Bottom Right Inverted Rank & Suit */}
      <div className={`absolute bottom-0.5 right-1 sm:bottom-1 sm:right-1.5 landscape:bottom-0.5 landscape:right-0.5 flex flex-col items-center leading-none font-bold rotate-180 ${textColor}`}>
        <span className="tracking-tighter">{card.rankLabel}</span>
        <span className="text-[10px] sm:text-xs landscape:text-[9px] -mt-0.5">{card.suitSymbol}</span>
      </div>
    </div>
  );
};
