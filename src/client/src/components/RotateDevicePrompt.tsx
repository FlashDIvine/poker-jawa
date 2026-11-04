import React, { useState, useEffect } from 'react';
import { RotateCw, Maximize2 } from 'lucide-react';

export const RotateDevicePrompt: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Height > Width indicates portrait mode
      const isPortraitNow = window.innerHeight > window.innerWidth;
      // Mobile screen or touch device check
      const isMobileNow =
        (window.innerWidth <= 1024 || window.innerHeight <= 1024) &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0);

      setIsPortrait(isPortraitNow);
      setIsMobile(isMobileNow);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  const handleRequestFullscreenAndLandscape = async () => {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      if (window.screen?.orientation && 'lock' in window.screen.orientation) {
        await (window.screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (e) {
      // Ignore if rejected by browser policy
    }
  };

  if (!isPortrait || !isMobile || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      {/* Decorative Casino Glow */}
      <div className="absolute inset-0 bg-radial from-amber-500/15 via-emerald-950/30 to-transparent pointer-events-none" />

      {/* Rotating Phone Animation Box */}
      <div className="relative w-28 h-28 mb-6 flex items-center justify-center z-10">
        {/* Outer Circular Ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30 animate-spin"
          style={{ animationDuration: '10s' }}
        />

        {/* Phone Icon Rotating to Landscape */}
        <div className="relative animate-rotate-phone flex items-center justify-center">
          <div className="w-14 h-24 rounded-2xl border-4 border-amber-400 bg-slate-900 shadow-2xl shadow-amber-500/40 flex flex-col items-center justify-between p-2">
            <div className="w-4 h-1 rounded-full bg-slate-700" />
            <div className="text-amber-400 text-lg font-serif-poker">♠</div>
            <div className="w-2.5 h-2.5 rounded-full border border-slate-700" />
          </div>
        </div>

        {/* Rotation Arrow Badge */}
        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-2 rounded-full shadow-lg animate-bounce">
          <RotateCw className="w-4 h-4 font-bold" />
        </div>
      </div>

      {/* Main Notice */}
      <div className="max-w-xs space-y-2 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <span>Mode Miring Diperlukan</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-serif-poker">
          Putar HP ke Mode Landscape
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed">
          Poker Remi dirancang khusus untuk layar miring (landscape) agar meja kasino, kartu tangan, dan posisi pemain terlihat luas dan nyaman.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-7 flex flex-col w-full max-w-xs gap-2.5 z-10">
        <button
          onClick={handleRequestFullscreenAndLandscape}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition-all text-sm"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Kunci Layar Penuh Miring</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="w-full py-2.5 px-4 rounded-xl text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
        >
          Tetap Main Mode Tegak (Portrait)
        </button>
      </div>

      <div className="mt-5 text-[11px] text-slate-500 flex items-center gap-1.5 z-10">
        <span>💡</span>
        <span>Atau cukup balikkan posisi HP Anda secara horizontal</span>
      </div>
    </div>
  );
};
