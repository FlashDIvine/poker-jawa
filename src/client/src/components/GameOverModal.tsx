import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameResult } from '@shared/types.js';
import { Trophy, RotateCcw, Home, Sparkles } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

interface GameOverModalProps {
  results: GameResult[] | null;
  winnerId: string | null;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  results,
  winnerId,
  isHost,
  onPlayAgain,
  onLeaveRoom
}) => {
  useEffect(() => {
    // Trigger colorful confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    } catch (e) {
      // Ignore if confetti fails in headless env
    }
  }, []);

  if (!results) return null;

  const winner = results.find(r => r.isWinner) || results[0];
  const pokerLosers = results.filter(r => r.caughtHoldingPoker);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center">
        {/* Glowing Trophy Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/40 -mt-10 sm:-mt-14 mb-2 sm:mb-3 border-4 border-slate-900 shrink-0">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-slate-950" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 flex items-center gap-2">
          <span>Permainan Berakhir!</span>
          <Sparkles className="w-5 h-5 text-yellow-300" />
        </h2>

        <p className="text-sm text-slate-300 mt-1">
          <strong className="text-yellow-400 font-bold">{winner.playerName}</strong> berhasil menghabiskan seluruh kartu!
        </p>

        {/* Booing ("Huuuuuu!") Notice Banner if players held Poker cards */}
        {pokerLosers.length > 0 && (
          <div className="w-full mt-3 bg-gradient-to-r from-red-950/90 via-rose-900/90 to-red-950/90 border-2 border-red-500/80 rounded-2xl p-3 text-center shadow-lg shadow-red-900/40 animate-boo-banner">
            <div className="flex items-center justify-center gap-2 text-red-200 font-black text-sm sm:text-base">
              <span className="text-lg">👎</span>
              <span className="text-amber-300 tracking-wider">HUUUUUU! KENA BOOING!</span>
              <span className="text-lg">👎</span>
            </div>
            <p className="text-xs text-rose-100 mt-0.5 font-medium">
              <strong className="text-yellow-300">{pokerLosers.map(p => p.playerName).join(', ')}</strong> masih memegang <span className="bg-red-800 text-amber-200 px-1 py-0.5 rounded font-bold font-mono">Kartu Poker (2)</span> di akhir game sehingga langsung kalah telak!
            </p>
            <button
              onClick={() => sounds.playBooingSound()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow transition-all active:scale-95 cursor-pointer"
            >
              <span>🔊</span>
              <span>Soraki Huuuuuu Lagi!</span>
            </button>
          </div>
        )}

        {/* Podium Table */}
        <div className="w-full mt-5 space-y-2">
          {results.map((res) => {
            const isFirst = res.rank === 1;
            const isBooed = Boolean(res.caughtHoldingPoker);

            return (
              <div
                key={res.playerId}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isFirst
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-500/20'
                    : isBooed
                    ? 'bg-red-950/50 border-red-500/80 shadow-md shadow-red-900/40'
                    : 'bg-slate-800/50 border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                      isFirst
                        ? 'bg-gradient-to-tr from-yellow-400 to-amber-500 text-slate-950'
                        : isBooed
                        ? 'bg-gradient-to-tr from-red-600 to-rose-700 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isFirst ? '🏆' : isBooed ? '👎' : `#${res.rank}`}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{res.avatar}</span>
                    <span className="font-semibold text-sm sm:text-base text-slate-100">
                      {res.playerName}
                    </span>
                    {res.isBot && (
                      <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.5 rounded">
                        BOT
                      </span>
                    )}
                    {isBooed && (
                      <span className="text-[10px] bg-red-600/90 text-white border border-red-400/80 px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1 shadow-sm">
                        <span>👎</span>
                        <span>{res.pokerCardsCount && res.pokerCardsCount > 1 ? `HUUU! (${res.pokerCardsCount}x Kartu 2)` : 'HUUU! (Kartu 2)'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400">
                    Sisa: <strong className={isBooed ? 'text-red-300' : 'text-slate-200'}>{res.remainingCards} kartu</strong>
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      res.scoreDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {res.scoreDelta > 0 ? `+${res.scoreDelta}` : res.scoreDelta} poin
                    {isBooed && (
                      <span className="text-[10px] block text-red-300 font-normal">
                        (Penalti Poker {Math.pow(2, res.pokerCardsCount || 1)}x)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 w-full">
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Main Lagi</span>
            </button>
          ) : (
            <div className="flex-1 text-center text-xs text-slate-400 py-2">
              Menunggu Tuan Rumah memulai ulang...
            </div>
          )}

          <button
            onClick={onLeaveRoom}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Lobi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
