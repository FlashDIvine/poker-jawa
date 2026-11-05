import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player } from '@shared/types.js';
import { PlayerSeat } from './PlayerSeat.js';
import { CenterTable } from './CenterTable.js';
import { ActionPanel } from './ActionPanel.js';
import { BooingBanner } from './BooingBanner.js';
import { sortCards } from '@shared/deck.js';
import { Copy, Check, Play, BookOpen, LogOut, Volume2, VolumeX, ShieldAlert, Maximize, Minimize, MessageSquare } from 'lucide-react';
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
  onResumeControl?: () => void;
  onDismissBooing?: () => void;
  isGameOverModalOpen?: boolean;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  unreadChatCount?: number;
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
  onClearError,
  onResumeControl,
  onDismissBooing,
  isGameOverModalOpen = false,
  onToggleChat,
  isChatOpen = false,
  unreadChatCount = 0
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'rank' | 'suit'>('rank');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMuted, setIsMuted] = useState(!sounds.enabled);
  const [isDealing, setIsDealing] = useState(false);
  const [isDiscardingThrees, setIsDiscardingThrees] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(gameState.rules?.allowHints !== false);

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

    let dealTimer: any = null;
    let discardTimer: any = null;

    if (gameState.status === 'playing' && (isGameStarted || isNewRound)) {
      setIsDealing(true);
      setIsDiscardingThrees(false);
      sounds.playDeal();

      // Tahap 1: Animasi pembagian kartu ke tangan pemain (1.1s)
      dealTimer = setTimeout(() => {
        setIsDealing(false);

        // Tahap 2: Animasi pembuangan 4 kartu angka 3 ke tengah meja di awal game (2.4s)
        if (gameState.rules?.discardThrees !== false) {
          setIsDiscardingThrees(true);
          sounds.playCardSnap();

          discardTimer = setTimeout(() => {
            setIsDiscardingThrees(false);
          }, 2400);
        }
      }, 1100);
    }

    prevStatusRef.current = gameState.status;
    prevRoundRef.current = gameState.roundNumber;

    return () => {
      if (dealTimer) clearTimeout(dealTimer);
      if (discardTimer) clearTimeout(discardTimer);
    };
  }, [gameState.status, gameState.roundNumber, gameState.rules?.discardThrees]);

  // Jika kartu pertama sudah dikeluarkan ke meja oleh pemain/bot, langsung selesaikan intro agar meja aktif terlihat
  useEffect(() => {
    if (gameState.lastPlay) {
      setIsDealing(false);
      setIsDiscardingThrees(false);
    }
  }, [gameState.lastPlay]);

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
  const isBooedPlayer = (playerId: string) => Boolean(gameState.results?.find(r => r.playerId === playerId)?.caughtHoldingPoker);

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
    <div className="w-full min-h-screen landscape:min-h-screen landscape:h-[100dvh] landscape:h-screen flex flex-col justify-between bg-slate-950 text-slate-100 select-none pb-0.5 sm:pb-4 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 w-full max-w-6xl mx-auto px-1.5 sm:px-4 py-1 sm:py-2.5 landscape:py-0.5 pt-[max(0.375rem,env(safe-area-inset-top,0px))] flex items-center justify-between shrink-0 z-20 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-sm">
        {/* Room Info & Code Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer shrink-0"
            title="Tinggalkan Meja"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-bold text-xs sm:text-base text-slate-200 truncate max-w-[95px] xs:max-w-[140px] sm:max-w-xs">
                {gameState.roomName}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-mono font-bold cursor-pointer transition-all shrink-0"
                title="Salin Kode Meja"
              >
                <span>{gameState.roomId}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[9px] xs:text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap">
                #{gameState.roundNumber} • {gameState.players.length}/{gameState.maxPlayers || 4} P
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {gameState.rules?.presetName || (gameState.rules?.preset === 'poker_jawa' ? 'Poker Jawa' : gameState.rules?.preset === 'custom' ? 'Kustom' : 'Default Remi')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Chat Trigger (Non-overlapping Header Integration) */}
          {onToggleChat && (
            <button
              onClick={onToggleChat}
              className={`relative flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                isChatOpen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80'
              }`}
              title="Obrolan Meja"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline text-xs font-semibold">Obrolan</span>
              {unreadChatCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500 text-slate-950 leading-none">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Landscape)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />}
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 cursor-pointer transition-all"
            title="Aturan Permainan"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="hidden sm:inline">Aturan</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
            title="Suara"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Floating AFK / AutoPlay Takeover Notification Toast (Positioned below top seats to avoid collision) */}
      {gameState.status === 'playing' && me?.isAutoPlay && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-35 pointer-events-none w-auto max-w-[92vw] compact-landscape-hide">
          <div
            onClick={onResumeControl}
            className="pointer-events-auto bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-purple-950/95 border border-purple-400/90 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 shadow-2xl flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-purple-900 transition-all backdrop-blur-md animate-fadeIn"
          >
            <span className="text-sm sm:text-base animate-pulse">🤖</span>
            <span className="text-[11px] sm:text-xs font-bold text-amber-300 whitespace-nowrap">
              Mode Bot Aktif (AFK)
            </span>
            <span className="hidden sm:inline text-[10px] text-purple-200">
              • Ketuk untuk ambil alih (ON)
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResumeControl?.();
              }}
              className="px-2 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] sm:text-xs shadow transition-all cursor-pointer shrink-0"
            >
              ON
            </button>
          </div>
        </div>
      )}

      {/* Floating Error Message Toast (Positioned below top seats to avoid collision with top opponent or chat) */}
      {errorMessage && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-auto max-w-[92vw]">
          <div className="pointer-events-auto bg-rose-950/95 border border-rose-500 text-rose-200 px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs backdrop-blur-md animate-fadeIn">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate max-w-[200px] xs:max-w-xs">{errorMessage}</span>
            <button onClick={onClearError} className="ml-1 font-bold cursor-pointer text-sm hover:text-white shrink-0">×</button>
          </div>
        </div>
      )}

      {/* Floating Booing "Huuuuuu!" Banner on game over (hidden when game over modal is active) */}
      {gameState.status === 'game_over' && !isGameOverModalOpen && gameState.hasPokerBooing && gameState.pokerLoserNames && (
        <BooingBanner
          loserNames={gameState.pokerLoserNames}
          isSelfLoser={Boolean(gameState.results?.find(r => r.playerId === me?.id)?.caughtHoldingPoker)}
          onDismiss={onDismissBooing}
        />
      )}

      {/* Main Felt Casino Table Area */}
      <main className="w-full max-w-6xl mx-auto px-1 sm:px-3 flex-1 min-h-0 flex flex-col justify-center my-0 sm:my-1">
        {/* Top Seats Exterior (Opponents outside green felt table) - Safe clearance from header */}
        {topOpponents.length > 0 && (
          <div className="w-full flex justify-center items-center gap-1 sm:gap-3 z-10 flex-wrap pt-2.5 sm:pt-3.5 pb-0.5 landscape:pt-1.5 landscape:pb-0 min-h-[32px] sm:min-h-[48px] shrink-0">
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
                isBooed={isBooedPlayer(player.id)}
              />
            ))}
          </div>
        )}

        {/* Middle Row: Left Seats Exterior, Shrunk Center Felt Table, Right Seats Exterior */}
        <div className="w-full flex items-center justify-between gap-1 sm:gap-2 my-auto landscape:my-0 z-10 px-1 sm:px-2 min-h-0">
          {/* Left Seats Exterior (Opponents) */}
          {leftOpponents.length > 0 ? (
            <div className={`flex flex-col items-center justify-center gap-1 sm:gap-2 shrink-0 ${isCompact ? 'w-11 xs:w-13 sm:w-20' : 'w-12 xs:w-14 sm:w-24'}`}>
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
                  isBooed={isBooedPlayer(player.id)}
                />
              ))}
            </div>
          ) : (
            <div className="w-1 sm:w-4 shrink-0" />
          )}

          {/* Shrunk Elegant Casino Green Felt Table (Focus purely on card play & clean spacious look) */}
          <div
            onClick={() => {
              if (me?.isAutoPlay && onResumeControl) {
                onResumeControl();
              }
            }}
            className="relative flex-1 min-w-0 max-w-full sm:max-w-2xl md:max-w-3xl landscape:max-w-xl landscape:sm:max-w-xl landscape:md:max-w-2xl mx-auto rounded-[16px] sm:rounded-[36px] md:rounded-[48px] felt-border felt-border-mobile-landscape p-0.5 sm:p-1.5 md:p-2.5 shadow-xl"
          >
            <div className="relative w-full rounded-[14px] sm:rounded-[28px] md:rounded-[40px] felt-table felt-table-mobile-landscape min-h-[85px] xs:min-h-[95px] sm:min-h-[190px] md:min-h-[250px] max-h-[175px] xs:max-h-[195px] sm:max-h-[320px] landscape:min-h-[75px] landscape:max-h-[135px] landscape:sm:min-h-[75px] landscape:sm:max-h-[135px] flex flex-col justify-center items-center p-1 xs:p-1.5 sm:p-4 landscape:p-1 landscape:sm:p-1.5 overflow-visible border border-emerald-400/20">
              {gameState.status === 'waiting' ? (
                <div className="flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl bg-slate-950/60 border border-amber-500/30 text-center max-w-md backdrop-blur-md">
                  <span className="text-xl sm:text-2xl mb-0.5 text-amber-400">♠ ♣ ♦ ♥</span>
                  <h3 className="text-sm sm:text-base font-bold text-amber-300">
                    Menunggu Permainan Dimulai
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 mb-2">
                    {gameState.players.length === 1 && !gameState.fillWithBots
                      ? 'Menunggu pemain lain bergabung (Minimal 2 pemain)...'
                      : !gameState.fillWithBots
                      ? `Ada ${gameState.players.length} pemain siap main tanpa bot! Kartu dibagi habis.`
                      : gameState.players.length < (gameState.maxPlayers || 4)
                      ? `Ada ${gameState.players.length} pemain. Kursi kosong diisi AI Bot.`
                      : `Semua ${gameState.maxPlayers || 4} pemain telah siap!`}
                  </p>

                  {me?.isHost ? (
                    <button
                      onClick={onStartGame}
                      disabled={!gameState.fillWithBots && gameState.players.length < 2}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold transition-all text-xs sm:text-sm shadow-lg ${
                        !gameState.fillWithBots && gameState.players.length < 2
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 cursor-pointer active:scale-95'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                      <span>
                        {!gameState.fillWithBots && gameState.players.length < 2
                          ? 'Menunggu Pemain Lain'
                          : gameState.fillWithBots && gameState.players.length < (gameState.maxPlayers || 4)
                          ? `Mulai (${gameState.maxPlayers || 4} Pemain + Bot)`
                          : `Mulai (${gameState.players.length} Pemain)`}
                      </span>
                    </button>
                  ) : (
                    <div className="text-xs text-amber-400/80 animate-pulse font-medium">
                      Menunggu Tuan Rumah memulai permainan...
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
                  isDiscardingThrees={isDiscardingThrees}
                  onSkipIntro={() => {
                    setIsDealing(false);
                    setIsDiscardingThrees(false);
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Seats Exterior (Opponents) */}
          {rightOpponents.length > 0 ? (
            <div className={`flex flex-col items-center justify-center gap-1 sm:gap-2 shrink-0 ${isCompact ? 'w-11 xs:w-13 sm:w-20' : 'w-12 xs:w-14 sm:w-24'}`}>
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
                  isBooed={isBooedPlayer(player.id)}
                />
              ))}
            </div>
          ) : (
            <div className="w-1 sm:w-4 shrink-0" />
          )}
        </div>

        {/* Bottom Seat Exterior (Self) - Shown in waiting room and game_over to display final rank & boo badges */}
        {(gameState.status === 'waiting' || gameState.status === 'game_over') && (
          <div className="w-full flex justify-center z-10 py-1">
            <PlayerSeat
              player={me}
              isCurrentTurn={isMyTurn}
              timeRemaining={gameState.turnTimeRemaining}
              timeMax={gameState.turnTimerMax}
              position="bottom"
              isSelf={true}
              isGamePlaying={false}
              isBooed={me ? isBooedPlayer(me.id) : false}
            />
          </div>
        )}
      </main>

      {/* Bottom Player Hand & Action Controls */}
      {gameState.status === 'playing' && me && (
        me.hand.length > 0 ? (
          <footer
            onClick={() => {
              if (me.isAutoPlay && onResumeControl) {
                onResumeControl();
              }
            }}
            className="w-full z-20"
          >
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
              player={me}
              turnTimeRemaining={gameState.turnTimeRemaining}
              turnTimerMax={gameState.turnTimerMax}
              onResumeControl={onResumeControl}
              hintsEnabled={gameState.rules?.allowHints !== false && hintsEnabled}
              onToggleHints={() => setHintsEnabled(prev => !prev)}
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
