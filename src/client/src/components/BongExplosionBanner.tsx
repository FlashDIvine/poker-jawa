import React, { useState } from 'react';
import { Volume2, X, Flame } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { BongLossInfo } from '@shared/types.js';

interface BongExplosionBannerProps {
  bongLossInfo: BongLossInfo;
  myPlayerId: string;
  onDismiss?: () => void;
}

export const BongExplosionBanner: React.FC<BongExplosionBannerProps> = ({
  bongLossInfo,
  myPlayerId,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const isVictim = myPlayerId === bongLossInfo.victimPlayerId;
  const isBomber = myPlayerId === bongLossInfo.bomberPlayerId;

  const handleClose = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const handleReplay = () => {
    sounds.playBongExplosion();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto animate-fadeIn">
      {/* Explosive Modal Container */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-red-950 via-slate-950 to-red-950 border-3 border-amber-500 rounded-3xl p-4 sm:p-6 text-center shadow-2xl shadow-red-600/60 animate-bong-modal overflow-hidden">
        {/* Fiery Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-red-900/60 hover:bg-red-800 text-rose-300 hover:text-white transition-all cursor-pointer z-10"
          title="Tutup Banner"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Explosive Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl sm:text-4xl animate-bounce">💣</span>
          <span className="text-3xl sm:text-4xl animate-pulse">💥</span>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-300 uppercase tracking-widest drop-shadow-lg">
            KENA BONG!
          </h2>
          <span className="text-3xl sm:text-4xl animate-pulse">💥</span>
          <span className="text-3xl sm:text-4xl animate-bounce">💣</span>
        </div>

        {/* Dramatic Tongkrongan Text */}
        <div className="bg-gradient-to-r from-red-900/80 via-rose-950/90 to-red-900/80 border border-amber-400/60 rounded-2xl p-3 sm:p-4 my-2.5 shadow-inner">
          <p className="text-base sm:text-lg font-black text-white leading-snug">
            {isVictim ? (
              <>
                <span className="text-amber-300">HUUUUU! KAMU KENA BONG!</span>
                <br />
                <span className="text-rose-400">Langsung Modar / Kalah Telak! 💀</span>
              </>
            ) : isBomber ? (
              <>
                <span className="text-amber-300">MANTAP! KAMU BERHASIL NGE-BONG!</span>
                <br />
                <span className="text-emerald-400">{bongLossInfo.victimName} Langsung Modar! 💥</span>
              </>
            ) : (
              <>
                <span className="text-amber-300">HUUUUU! {bongLossInfo.victimName} Kena BONG!</span>
                <br />
                <span className="text-rose-400">Langsung Modar / Kalah Telak! 💀</span>
              </>
            )}
          </p>
        </div>

        {/* Sub-text explanation */}
        <p className="text-xs sm:text-sm text-slate-300 font-medium px-2 mt-2">
          Kartu 2 (Poker) milik <strong className="text-amber-300">{bongLossInfo.victimName}</strong> dihantam telak oleh <strong className="text-yellow-400">{bongLossInfo.bomberName}</strong> dengan kombinasi <span className="bg-rose-900/90 text-amber-200 px-2 py-0.5 rounded-full font-bold border border-rose-500/50">{bongLossInfo.bongDescription}</span>!
        </p>

        {/* Tongkrongan Rule Badge */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-rose-200/90 bg-red-950/70 border border-red-500/40 rounded-xl py-1.5 px-3 mx-auto max-w-md">
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Aturan Tongkrongan: Buang kartu 2 lalu dipotong BONG langsung kalah telak seketika &amp; juru kunci!</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-700/50 active:scale-95 transition-all cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Ledakkan &amp; Soraki Huu Lagi!</span>
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            Lihat Papan Skor
          </button>
        </div>
      </div>
    </div>
  );
};
