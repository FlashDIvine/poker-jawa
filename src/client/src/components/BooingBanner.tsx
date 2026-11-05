import React, { useEffect, useState } from 'react';
import { Volume2, X, ThumbsDown } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

interface BooingBannerProps {
  loserNames: string[];
  isSelfLoser: boolean;
  onDismiss?: () => void;
}

export const BooingBanner: React.FC<BooingBannerProps> = ({
  loserNames,
  isSelfLoser,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || loserNames.length === 0) return null;

  const handleClose = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const handleReplay = () => {
    sounds.playBooingSound();
  };

  return (
    <div className="fixed top-10 sm:top-16 left-1/2 -translate-x-1/2 z-45 w-full max-w-md sm:max-w-lg px-2 sm:px-3 pointer-events-none">
      <div className="relative bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-2 border-red-500/90 rounded-2xl sm:rounded-3xl p-3 sm:p-5 landscape:p-2.5 shadow-2xl shadow-red-600/40 text-center backdrop-blur-md animate-boo-banner pointer-events-auto max-h-[85vh] overflow-y-auto">
        {/* Dismiss Button */}
        <button
          onClick={handleClose}
          className="absolute top-2.5 right-2.5 p-1 rounded-full bg-red-900/60 hover:bg-red-800 text-rose-300 hover:text-white transition-all cursor-pointer"
          title="Tutup Banner"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with animated thumbs down and sound */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl sm:text-3xl animate-bounce">👎</span>
          <h3 className="text-xl sm:text-2xl font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5 drop-shadow-md">
            HUUUUUU!
          </h3>
          <span className="text-2xl sm:text-3xl animate-bounce">👎</span>
        </div>

        {/* Subtitle / Explanation */}
        <p className="text-xs sm:text-sm text-rose-100 font-semibold px-2">
          {isSelfLoser ? (
            <>
              Aduh! <strong className="text-amber-300 underline font-black">Kamu</strong> masih memegang <span className="bg-red-800/90 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">Kartu Poker (angka 2)</span> di akhir game sehingga <span className="text-yellow-300 font-black">LANGSUNG KALAH</span>!
            </>
          ) : (
            <>
              Soraki ramai-ramai! <strong className="text-amber-300 font-black">{loserNames.join(', ')}</strong> masih memegang <span className="bg-red-800/90 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">Kartu Poker (angka 2)</span> di akhir game sehingga <span className="text-yellow-300 font-black">LANGSUNG KALAH</span>!
            </>
          )}
        </p>

        {/* Fun rule reminder tag */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-rose-200/90 bg-red-950/70 border border-red-500/40 rounded-xl py-1 px-2.5 mx-auto max-w-sm">
          <span>⚠️</span>
          <span>Aturan Remi: Pemegang kartu 2 di akhir ronde langsung peringkat buncit & disoraki Huuu!</span>
        </div>

        {/* Sound Replay Button */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-700/50 active:scale-95 transition-all cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Soraki Huuuuuu Lagi!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
