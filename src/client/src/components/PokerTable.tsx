import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player } from '@shared/types.js';
import { PlayerSeat } from './PlayerSeat.js';
import { CenterTable } from './CenterTable.js';
import { ActionPanel } from './ActionPanel.js';
import { sortCards } from '@shared/deck.js';
import { Copy, Check, Play, BookOpen, LogOut, Volume2, VolumeX, ShieldAlert, Maximize, Minimize } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

interface PokerTableProps {
  gameState: GameState;
  myPlayerId: string;
  onPlayCards: (cardIds: string[]) => void;
  onPassTurn: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onOpenRules: () => void;
  errorMessage: string | null;
  onClearError: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  gameState,
  myPlayerId,
  onPlayCards,
  onPassTurn,
  onStartGame,
  onLeaveRoom,
  onOpenRules,
  errorMessage,
  onClearError
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'rank' | 'suit'>('rank');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMuted, setIsMuted] = useState(!sounds.enabled);
  const [isDealing, setIsDealing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          await (window.screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      }
    } catch (e) {
      // ignore
    }
  };

  const prevStatusRef = useRef(gameState.status);
  const prevRoundRef = useRef(gameState.roundNumber);

  useEffect(() => {
    const isNewRound = prevRoundRef.current !== gameState.roundNumber;
    const isGameStarted = prevStatusRef.current !== 'playing' && gameState.status === 'playing';

    if (gameState.status === 'playing' && (isGameStarted || isNewRound)) {
      setIsDealing(true);
      sounds.playDeal();
      const timer = setTimeout(() => {
        setIsDealing(false);
      }, 1300);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = gameState.status;
    prevRoundRef.current = gameState.roundNumber;
  }, [gameState.status, gameState.roundNumber]);

  const me = gameState.players.find(p => p.id === myPlayerId) || gameState.players[0];
  const mySeatIdx = me?.seatIndex ?? 0;

  // Relative seat mapping so "me" is always at bottom:
  const totalPlayers = gameState.players.length;

  const opponents = gameState.players
    .filter(p => p.id !== me?.id)
    .sort((a, b) => {
      const diffA = (a.seatIndex - mySeatIdx + totalPlayers) % totalPlayers;
      const diffB = (b.seatIndex - mySeatIdx + totalPlayers) % totalPlayers;
      return diffA - diffB;
    });

  const numOpponents = opponents.length;
  const isCompact = totalPlayers > 4;

  let leftOpponents: Player[] = [];
  let topOpponents: Player[] = [];
  let rightOpponents: Player[] = [];

  if (numOpponents === 1) {
    topOpponents = [opponents[0]];
  } else if (numOpponents === 2) {
    leftOpponents = [opponents[0]];
    rightOpponents = [opponents[1]];
  } else if (numOpponents === 3) {
    leftOpponents = [opponents[0]];
    topOpponents = [opponents[1]];
    rightOpponents = [opponents[2]];
  } else if (numOpponents > 3) {
    const leftCount = numOpponents >= 6 ? 2 : 1;
    const rightCount = numOpponents >= 6 ? 2 : 1;
    const topCount = numOpponents - leftCount - rightCount;
    leftOpponents = opponents.slice(0, leftCount);
    topOpponents = opponents.slice(leftCount, leftCount + topCount);
    rightOpponents = opponents.slice(leftCount + topCount);
  }

  // Compute which UI zone played the last trick relative to "me"
  const playedPlayer = gameState.players.find(p => p.id === gameState.lastPlay?.playerId);
  let playedFrom: 'bottom' | 'left' | 'top' | 'right' = 'bottom';
  if (playedPlayer) {
    if (playedPlayer.id === me?.id) {
      playedFrom = 'bottom';
    } else if (leftOpponents.some(p => p.id === playedPlayer.id)) {
      playedFrom = 'left';
    } else if (topOpponents.some(p => p.id === playedPlayer.id)) {
      playedFrom = 'top';
    } else if (rightOpponents.some(p => p.id === playedPlayer.id)) {
      playedFrom = 'right';
    }
  }

  const isMyTurn = gameState.status === 'playing' && gameState.currentTurnPlayerId === me?.id;

  const sortedHand = me ? sortCards(me.hand, sortMode) : [];

  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds((prev: string[]) =>
      prev.includes(cardId) ? prev.filter((id: string) => id !== cardId) : [...prev, cardId]
    );
    if (errorMessage) onClearError();
  };

  const handleSelectCards = (cardIds: string[]) => {
    setSelectedCardIds(cardIds);
    if (errorMessage) onClearError();
  };

  const handleClearSelection = () => {
    setSelectedCardIds([]);
    if (errorMessage) onClearError();
  };

  const handlePlaySelected = () => {
    if (selectedCardIds.length === 0) return;
    onPlayCards(selectedCardIds);
    setSelectedCardIds([]);
  };

  const handlePass = () => {
    onPassTurn();
    setSelectedCardIds([]);
  };

  const handleSortToggle = () => {
    setSortMode((prev: 'rank' | 'suit') => (prev === 'rank' ? 'suit' : 'rank'));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameState.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleSound = () => {
    const enabled = sounds.toggle();
    setIsMuted(!enabled);
  };

  return (
    <div className="w-full min-h-screen landscape:h-screen landscape:overflow-hidden flex flex-col justify-between bg-slate-950 text-slate-100 select-none pb-1 sm:pb-4">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3 flex items-center justify-between z-20">
        {/* Room Info & Code Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
            title="Tinggalkan Meja"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-xs sm:text-base text-slate-200 truncate max-w-[120px] sm:max-w-xs">
                {gameState.roomName}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-mono font-bold cursor-pointer transition-all"
                title="Salin Kode Meja"
              >
                <span>{gameState.roomId}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] text-slate-400">
                Putaran #{gameState.roundNumber} • {gameState.players.length}/{gameState.maxPlayers || 4} Pemain
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {gameState.rules?.presetName || (gameState.rules?.preset === 'poker_jawa' ? 'Poker Jawa' : gameState.rules?.preset === 'custom' ? 'Kustom' : 'Default Remi')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Landscape)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-slate-300" />}
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 cursor-pointer transition-all"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Aturan</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Floating Error Message Banner */}
      {errorMessage && (
        <div className="fixed top-12 sm:top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950/90 border border-rose-500 text-rose-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-bounce">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
          <button onClick={onClearError} className="ml-2 font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* Main Felt Casino Table Area */}
      <main className="w-full max-w-6xl mx-auto px-1 sm:px-4 flex-1 min-h-0 flex flex-col justify-center my-0 sm:my-2">
        <div className="relative w-full rounded-[24px] sm:rounded-[40px] md:rounded-[60px] felt-border felt-border-mobile-landscape p-1 sm:p-2.5 md:p-4 shadow-2xl">
          <div className="relative w-full rounded-[20px] sm:rounded-[30px] md:rounded-[50px] felt-table felt-table-mobile-landscape min-h-[190px] sm:min-h-[360px] md:min-h-[500px] flex flex-col justify-between p-1.5 sm:p-4 overflow-hidden border border-emerald-400/20">

            {/* Top Seats (Opponents) */}
            <div className="w-full flex justify-center items-center gap-1.5 sm:gap-4 z-10 flex-wrap min-h-[40px] sm:min-h-[80px]">
              {topOpponents.map(player => (
                <PlayerSeat
                  key={player.id}
                  player={player}
                  isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                  timeRemaining={gameState.turnTimeRemaining}
                  timeMax={gameState.turnTimerMax}
                  position="top"
                  isDealing={isDealing}
                  isGamePlaying={gameState.status === 'playing'}
                  compact={isCompact}
                />
              ))}
              {topOpponents.length === 0 && !gameState.status.includes('playing') && totalPlayers < 3 && (
                <div className="h-10" />
              )}
            </div>

            {/* Middle Row: Left Seats, Center Felt, Right Seats */}
            <div className="w-full flex items-center justify-between px-2 sm:px-6 my-auto z-10">
              {/* Left Seats (Opponents) */}
              <div className={`flex flex-col items-center justify-center gap-2 ${isCompact ? 'w-20 sm:w-24' : 'w-24 sm:w-28'}`}>
                {leftOpponents.map(player => (
                  <PlayerSeat
                    key={player.id}
                    player={player}
                    isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                    timeRemaining={gameState.turnTimeRemaining}
                    timeMax={gameState.turnTimerMax}
                    position="left"
                    isDealing={isDealing}
                    isGamePlaying={gameState.status === 'playing'}
                    compact={isCompact}
                  />
                ))}
              </div>

              {/* Center Table Area */}
              <div className="flex-1 flex flex-col items-center justify-center px-2">
                {gameState.status === 'waiting' ? (
                  <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/60 border border-amber-500/30 text-center max-w-md backdrop-blur-md">
                    <span className="text-3xl mb-2">♠ ♣ ♦ ♥</span>
                    <h3 className="text-lg font-bold text-amber-300">
                      Menunggu Permainan Dimulai
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 mb-4">
                      {gameState.players.length === 1 && !gameState.fillWithBots
                        ? 'Menunggu pemain lain bergabung (Minimal 2 pemain untuk memulai permainan)...'
                        : !gameState.fillWithBots
                        ? `Saat ini ada ${gameState.players.length} pemain siap main tanpa bot! Kartu akan dibagi habis secara merata.`
                        : gameState.players.length < (gameState.maxPlayers || 4)
                        ? `Saat ini ada ${gameState.players.length} pemain. Kursi kosong hingga kapasitas (${gameState.maxPlayers || 4} pemain) akan diisi AI Bot.`
                        : `Semua ${gameState.maxPlayers || 4} pemain telah siap di meja!`}
                    </p>

                    {me?.isHost ? (
                      <button
                        onClick={onStartGame}
                        disabled={!gameState.fillWithBots && gameState.players.length < 2}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-lg ${
                          !gameState.fillWithBots && gameState.players.length < 2
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 cursor-pointer active:scale-95'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          {!gameState.fillWithBots && gameState.players.length < 2
                            ? 'Menunggu Pemain Lain (Min. 2)'
                            : gameState.fillWithBots && gameState.players.length < (gameState.maxPlayers || 4)
                            ? `Mulai Permainan (${gameState.maxPlayers || 4} Pemain + Bot)`
                            : `Mulai Permainan (${gameState.players.length} Pemain)`}
                        </span>
                      </button>
                    ) : (
                      <div className="text-xs text-amber-400/80 animate-pulse font-medium">
                        Menunggu Tuan Rumah memulai pembagian kartu...
                      </div>
                    )}
                  </div>
                ) : (
                  <CenterTable
                    lastPlay={gameState.lastPlay}
                    isFirstTurnOfGame={gameState.isFirstTurnOfGame}
                    leadPlayerName={gameState.players.find(p => p.id === gameState.leadPlayerId)?.name}
                    playedFrom={playedFrom}
                    isDealing={isDealing}
                  />
                )}
              </div>

              {/* Right Seats (Opponents) */}
              <div className={`flex flex-col items-center justify-center gap-2 ${isCompact ? 'w-20 sm:w-24' : 'w-24 sm:w-28'}`}>
                {rightOpponents.map(player => (
                  <PlayerSeat
                    key={player.id}
                    player={player}
                    isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                    timeRemaining={gameState.turnTimeRemaining}
                    timeMax={gameState.turnTimerMax}
                    position="right"
                    isDealing={isDealing}
                    isGamePlaying={gameState.status === 'playing'}
                    compact={isCompact}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Seat (Self) */}
            <div className="w-full flex justify-center z-10 mt-auto">
              <PlayerSeat
                player={me}
                isCurrentTurn={isMyTurn}
                timeRemaining={gameState.turnTimeRemaining}
                timeMax={gameState.turnTimerMax}
                position="bottom"
                isSelf={true}
                isGamePlaying={gameState.status === 'playing'}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Player Hand & Action Controls */}
      {gameState.status === 'playing' && me && (
        me.hand.length > 0 ? (
          <footer className="w-full z-20">
            <ActionPanel
              hand={sortedHand}
              selectedCardIds={selectedCardIds}
              onToggleCard={handleToggleCard}
              onSelectCards={handleSelectCards}
              onClearSelection={handleClearSelection}
              onPlaySelected={handlePlaySelected}
              onPass={handlePass}
              onSortToggle={handleSortToggle}
              sortMode={sortMode}
              isMyTurn={isMyTurn}
              lastPlay={gameState.lastPlay}
              isFirstTurnOfGame={gameState.isFirstTurnOfGame}
              isDealing={isDealing}
              rules={gameState.rules}
            />
          </footer>
        ) : (
          <footer className="w-full z-20 max-w-md mx-auto p-3 mb-2 animate-fade-in">
            <div className="bg-slate-900/95 border border-amber-500/50 rounded-2xl p-3.5 text-center shadow-2xl backdrop-blur-md">
              <span className="text-2xl">🎉 {me.finishRank === 1 ? '🥇' : me.finishRank === 2 ? '🥈' : '🥉'}</span>
              <h4 className="text-sm font-extrabold text-amber-300 mt-0.5">
                Kartu Anda Sudah Habis! (Juara {me.finishRank || 1})
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Permainan masih berlanjut hingga pemegang kartu terakhir...
              </p>
            </div>
          </footer>
        )
      )}
    </div>
  );
};
