import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, GameState, Player } from '@shared/types.js';
import { PlayerSeat } from './PlayerSeat.js';
import { CenterTable, DISCARDED_THREES } from './CenterTable.js';
import { PlayingCard } from './PlayingCard.js';
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
  const [discardStep, setDiscardStep] = useState(4);
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
  const hasTriggeredInitialIntroRef = useRef(false);
  const discardTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cancelDiscardIntro = () => {
    discardTimersRef.current.forEach(t => clearTimeout(t));
    discardTimersRef.current = [];
    setIsDealing(false);
    setIsDiscardingThrees(false);
    setDiscardStep(4);
  };

  // Immediate abort guard: if cards were played, round finished/waiting, turn time low, or not first turn, cancel any intro immediately
  useEffect(() => {
    if (
      gameState.lastPlay ||
      !gameState.isFirstTurnOfGame ||
      gameState.status !== 'playing' ||
      gameState.turnTimeRemaining <= 5 ||
      (gameState.trickHistory && gameState.trickHistory.length > 0)
    ) {
      cancelDiscardIntro();
    }
  }, [
    gameState.lastPlay,
    gameState.isFirstTurnOfGame,
    gameState.status,
    gameState.turnTimeRemaining,
    gameState.trickHistory?.length
  ]);

  useEffect(() => {
    const isNewRound = prevRoundRef.current !== gameState.roundNumber;
    const isGameStarted = prevStatusRef.current !== 'playing' && gameState.status === 'playing';
    const isInitialMountPlaying = !hasTriggeredInitialIntroRef.current && gameState.status === 'playing' && gameState.isFirstTurnOfGame && !gameState.lastPlay;

    prevStatusRef.current = gameState.status;
    prevRoundRef.current = gameState.roundNumber;

    if (
      gameState.status === 'playing' &&
      (isGameStarted || isNewRound || isInitialMountPlaying) &&
      !gameState.lastPlay &&
      gameState.isFirstTurnOfGame &&
      (!gameState.trickHistory || gameState.trickHistory.length === 0)
    ) {
      hasTriggeredInitialIntroRef.current = true;
      cancelDiscardIntro();

      setIsDealing(true);
      setIsDiscardingThrees(false);
      setDiscardStep(0);
      sounds.playDeal();

      // Tahap 1: Animasi pembagian kartu ke tangan pemain (0.9s)
      const dealTimer = setTimeout(() => {
        setIsDealing(false);

        // Tahap 2: Animasi pembuangan 4 kartu angka 3 ke tengah meja secara bergantian (sequential)
        if (gameState.rules?.discardThrees !== false) {
          setIsDiscardingThrees(true);
          setDiscardStep(0); // Awalnya semua pemain memegang kartu 3 di kursi masing-masing (durasi 1.0s agar terlihat jelas)

          // Kartu 1 dibuang ke tengah
          const t1 = setTimeout(() => {
            setDiscardStep(1);
            sounds.playCardSnap();
          }, 1000);
          discardTimersRef.current.push(t1);

          // Kartu 2 dibuang ke tengah
          const t2 = setTimeout(() => {
            setDiscardStep(2);
            sounds.playCardSnap();
          }, 1850);
          discardTimersRef.current.push(t2);

          // Kartu 3 dibuang ke tengah
          const t3 = setTimeout(() => {
            setDiscardStep(3);
            sounds.playCardSnap();
          }, 2700);
          discardTimersRef.current.push(t3);

          // Kartu 4 (3♠ oleh pemegang pertama) dibuang ke tengah
          const t4 = setTimeout(() => {
            setDiscardStep(4);
            sounds.playCardSnap();
          }, 3550);
          discardTimersRef.current.push(t4);

          // Selesai intro pembuangan kartu 3
          const tDone = setTimeout(() => {
            setIsDiscardingThrees(false);
          }, 4900);
          discardTimersRef.current.push(tDone);
        }
      }, 900);
      discardTimersRef.current.push(dealTimer);
    }

    return () => {
      cancelDiscardIntro();
    };
  }, [
    gameState.status,
    gameState.roundNumber,
    gameState.rules?.discardThrees,
    gameState.isFirstTurnOfGame,
    Boolean(gameState.lastPlay)
  ]);

  // Jika kartu pertama sudah dikeluarkan ke meja oleh pemain/bot setelah intro, update discardStep
  useEffect(() => {
    if (gameState.lastPlay && !isDealing && !isDiscardingThrees) {
      setDiscardStep(4);
    }
  }, [gameState.lastPlay, isDealing, isDiscardingThrees]);

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

  const getPlayerPosition = (playerId: string): 'bottom' | 'top' | 'left' | 'right' => {
    if (playerId === me?.id) return 'bottom';
    if (topOpponents.some(p => p.id === playerId)) return 'top';
    if (leftOpponents.some(p => p.id === playerId)) return 'left';
    if (rightOpponents.some(p => p.id === playerId)) return 'right';
    return 'top';
  };

  // Map 4 rank-3 cards to players and seats for the initial reveal and sequential discard
  const { discardItems, assignedThrees } = useMemo(() => {
    const lead = gameState.players.find(p => p.id === gameState.leadPlayerId) || gameState.players[0];
    const others = gameState.players.filter(p => p.id !== lead?.id);

    // Shuffle non-3S cards based on roundNumber and roomId so they are random yet consistent for all clients in the round
    const pool = [DISCARDED_THREES[1], DISCARDED_THREES[2], DISCARDED_THREES[3]]; // 3C, 3D, 3H
    const roundSeed = (gameState.roundNumber || 1) + (gameState.roomId ? gameState.roomId.charCodeAt(0) : 0);
    const shuffledNonLead = [
      pool[roundSeed % 3],
      pool[(roundSeed + 1) % 3],
      pool[(roundSeed + 2) % 3]
    ];

    const items: Array<{
      card: Card;
      playerId: string;
      playerName: string;
      fromPosition: 'bottom' | 'left' | 'top' | 'right';
      order: number;
    }> = [];

    // Order 0, 1, 2: Random non-3S cards discarded by players
    // Order 3: 3S (lead player, opening starter)

    if (others.length >= 3) {
      items.push({ card: shuffledNonLead[0], playerId: others[0].id, playerName: others[0].name, fromPosition: getPlayerPosition(others[0].id), order: 0 });
      items.push({ card: shuffledNonLead[1], playerId: others[1].id, playerName: others[1].name, fromPosition: getPlayerPosition(others[1].id), order: 1 });
      items.push({ card: shuffledNonLead[2], playerId: others[2].id, playerName: others[2].name, fromPosition: getPlayerPosition(others[2].id), order: 2 });
    } else if (others.length === 2) {
      items.push({ card: shuffledNonLead[0], playerId: others[0].id, playerName: others[0].name, fromPosition: getPlayerPosition(others[0].id), order: 0 });
      items.push({ card: shuffledNonLead[1], playerId: others[1].id, playerName: others[1].name, fromPosition: getPlayerPosition(others[1].id), order: 1 });
      items.push({ card: shuffledNonLead[2], playerId: others[0].id, playerName: others[0].name, fromPosition: getPlayerPosition(others[0].id), order: 2 });
    } else if (others.length === 1) {
      items.push({ card: shuffledNonLead[0], playerId: others[0].id, playerName: others[0].name, fromPosition: getPlayerPosition(others[0].id), order: 0 });
      items.push({ card: shuffledNonLead[1], playerId: others[0].id, playerName: others[0].name, fromPosition: getPlayerPosition(others[0].id), order: 1 });
      items.push({ card: shuffledNonLead[2], playerId: lead ? lead.id : others[0].id, playerName: lead ? lead.name : others[0].name, fromPosition: lead ? getPlayerPosition(lead.id) : 'top', order: 2 });
    } else if (lead) {
      items.push({ card: shuffledNonLead[0], playerId: lead.id, playerName: lead.name, fromPosition: getPlayerPosition(lead.id), order: 0 });
      items.push({ card: shuffledNonLead[1], playerId: lead.id, playerName: lead.name, fromPosition: getPlayerPosition(lead.id), order: 1 });
      items.push({ card: shuffledNonLead[2], playerId: lead.id, playerName: lead.name, fromPosition: getPlayerPosition(lead.id), order: 2 });
    }

    if (lead) {
      items.push({ card: DISCARDED_THREES[0], playerId: lead.id, playerName: lead.name, fromPosition: getPlayerPosition(lead.id), order: 3 });
    }

    const byPlayer: Record<string, { card: Card; order: number }[]> = {};
    items.forEach(it => {
      if (!byPlayer[it.playerId]) byPlayer[it.playerId] = [];
      byPlayer[it.playerId].push({ card: it.card, order: it.order });
    });

    return { discardItems: items, assignedThrees: byPlayer };
  }, [gameState.players, gameState.leadPlayerId, gameState.roundNumber, gameState.roomId, topOpponents, leftOpponents, rightOpponents, me]);

  const getPlayerThreeInfo = (playerId: string) => {
    if (!isDiscardingThrees) return { card: null, isDiscarding: false, hasDiscarded: false };
    const playerThrees = assignedThrees[playerId];
    if (!playerThrees || playerThrees.length === 0) return { card: null, isDiscarding: false, hasDiscarded: false };

    const current = playerThrees.find(t => discardStep <= t.order + 1) || playerThrees[playerThrees.length - 1];
    const isDiscarding = discardStep === current.order + 1;
    const hasDiscarded = discardStep > current.order + 1;

    return {
      card: current.card,
      isDiscarding,
      hasDiscarded
    };
  };

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
    <div className="w-full min-h-[100dvh] h-[100dvh] flex flex-col justify-between bg-slate-950 text-slate-100 select-none overscroll-y-none pb-0.5 sm:pb-4 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 w-full max-w-6xl mx-auto px-1.5 sm:px-4 py-1 sm:py-2.5 landscape:py-0.5 pt-[max(0.375rem,env(safe-area-inset-top,0px))] pl-[max(0.375rem,env(safe-area-inset-left,0px))] pr-[max(0.375rem,env(safe-area-inset-right,0px))] flex items-center justify-between shrink-0 z-20 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-sm">
        {/* Room Info & Code Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer shrink-0"
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
                className="min-h-[44px] flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-mono font-bold cursor-pointer transition-all shrink-0"
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
              className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border cursor-pointer transition-all active:scale-95 ${
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
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Landscape)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />}
          </button>

          <button
            onClick={onOpenRules}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 cursor-pointer transition-all"
            title="Aturan Permainan"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="hidden sm:inline">Aturan</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
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
            {topOpponents.map(player => {
              const threeInfo = getPlayerThreeInfo(player.id);
              return (
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
                  heldThreeCard={threeInfo.card}
                  isDiscardingThree={threeInfo.isDiscarding}
                  hasDiscardedThree={threeInfo.hasDiscarded}
                />
              );
            })}
          </div>
        )}

        {/* Middle Row: Left Seats Exterior, Spacious Center Felt Table, Right Seats Exterior */}
        <div className="w-full flex items-center justify-between gap-1 sm:gap-2 my-auto landscape:my-0 z-10 px-1 sm:px-2 min-h-0">
          {/* Left Seats Exterior (Opponents) */}
          {leftOpponents.length > 0 ? (
            <div className={`flex flex-col items-center justify-center gap-1 sm:gap-2 shrink-0 ${isCompact ? 'w-11 xs:w-13 sm:w-20' : 'w-12 xs:w-14 sm:w-24'}`}>
              {leftOpponents.map(player => {
                const threeInfo = getPlayerThreeInfo(player.id);
                return (
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
                    heldThreeCard={threeInfo.card}
                    isDiscardingThree={threeInfo.isDiscarding}
                    hasDiscardedThree={threeInfo.hasDiscarded}
                  />
                );
              })}
            </div>
          ) : (
            <div className="w-1 sm:w-4 shrink-0" />
          )}

          {/* Spacious Elegant Casino Green Felt Table (Not squished/gepeng, authentic rounded card table) */}
          <div
            onClick={() => {
              if (me?.isAutoPlay && onResumeControl) {
                onResumeControl();
              }
            }}
            className="relative flex-1 min-w-0 max-w-full sm:max-w-2xl md:max-w-3xl mx-auto rounded-[22px] sm:rounded-[40px] md:rounded-[52px] felt-border felt-border-mobile-landscape p-1 sm:p-2 md:p-3 shadow-xl shrink-0"
          >
            <div className="relative w-full rounded-[18px] sm:rounded-[34px] md:rounded-[46px] felt-table felt-table-mobile-landscape min-h-[130px] xs:min-h-[150px] sm:min-h-[220px] md:min-h-[280px] max-h-[220px] xs:max-h-[260px] sm:max-h-[360px] md:max-h-[420px] flex flex-col justify-center items-center p-2 xs:p-2.5 sm:p-4 md:p-6 overflow-visible border border-emerald-400/20">
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
                  discardStep={discardStep}
                  discardItems={discardItems}
                  onSkipIntro={cancelDiscardIntro}
                />
              )}
            </div>
          </div>

          {/* Right Seats Exterior (Opponents) */}
          {rightOpponents.length > 0 ? (
            <div className={`flex flex-col items-center justify-center gap-1 sm:gap-2 shrink-0 ${isCompact ? 'w-11 xs:w-13 sm:w-20' : 'w-12 xs:w-14 sm:w-24'}`}>
              {rightOpponents.map(player => {
                const threeInfo = getPlayerThreeInfo(player.id);
                return (
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
                    heldThreeCard={threeInfo.card}
                    isDiscardingThree={threeInfo.isDiscarding}
                    hasDiscardedThree={threeInfo.hasDiscarded}
                  />
                );
              })}
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
              isDiscardingThrees={isDiscardingThrees}
              myHeldThree={me && getPlayerThreeInfo(me.id).card ? (getPlayerThreeInfo(me.id) as { card: Card; isDiscarding: boolean; hasDiscarded: boolean }) : null}
              onSkipIntro={cancelDiscardIntro}
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
