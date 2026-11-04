import React, { useState } from 'react';
import { GameState, Player } from '@shared/types.js';
import { PlayerSeat } from './PlayerSeat.js';
import { CenterTable } from './CenterTable.js';
import { ActionPanel } from './ActionPanel.js';
import { sortCards } from '@shared/deck.js';
import { Copy, Check, Play, BookOpen, LogOut, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
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

  const me = gameState.players.find(p => p.id === myPlayerId) || gameState.players[0];
  const mySeatIdx = me?.seatIndex ?? 0;

  // Relative seat mapping so "me" is always at bottom:
  // Bottom: me (seat mySeatIdx)
  // Left: seat (mySeatIdx + 1) % 4
  // Top: seat (mySeatIdx + 2) % 4
  // Right: seat (mySeatIdx + 3) % 4
  const getPlayerBySeat = (seatIdx: number): Player | undefined => {
    return gameState.players.find(p => p.seatIndex === seatIdx);
  };

  const leftPlayer = getPlayerBySeat((mySeatIdx + 1) % 4);
  const topPlayer = getPlayerBySeat((mySeatIdx + 2) % 4);
  const rightPlayer = getPlayerBySeat((mySeatIdx + 3) % 4);

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
    <div className="w-full min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 select-none pb-4">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 py-3 flex items-center justify-between z-20">
        {/* Room Info & Code Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
            title="Tinggalkan Meja"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-200">
                {gameState.roomName}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold cursor-pointer transition-all"
                title="Salin Kode Meja"
              >
                <span>{gameState.roomId}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              Putaran #{gameState.roundNumber} • {gameState.players.length}/4 Pemain
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 cursor-pointer transition-all"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Aturan</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Floating Error Message Banner */}
      {errorMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950/90 border border-rose-500 text-rose-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-bounce">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
          <button onClick={onClearError} className="ml-2 font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* Main Felt Casino Table Area */}
      <main className="w-full max-w-6xl mx-auto px-2 sm:px-4 flex-1 flex flex-col justify-center my-2">
        <div className="relative w-full rounded-[40px] sm:rounded-[60px] felt-border p-2.5 sm:p-4 shadow-2xl">
          <div className="relative w-full rounded-[30px] sm:rounded-[50px] felt-table min-h-[460px] sm:min-h-[500px] flex flex-col justify-between p-4 overflow-hidden border border-emerald-400/20">

            {/* Top Seat (Opponent 2) */}
            <div className="w-full flex justify-center z-10">
              <PlayerSeat
                player={topPlayer}
                isCurrentTurn={gameState.currentTurnPlayerId === topPlayer?.id}
                timeRemaining={gameState.turnTimeRemaining}
                timeMax={gameState.turnTimerMax}
                position="top"
              />
            </div>

            {/* Middle Row: Left Seat, Center Felt, Right Seat */}
            <div className="w-full flex items-center justify-between px-2 sm:px-6 my-auto z-10">
              {/* Left Seat (Opponent 1) */}
              <div className="w-24 sm:w-28 flex justify-center">
                <PlayerSeat
                  player={leftPlayer}
                  isCurrentTurn={gameState.currentTurnPlayerId === leftPlayer?.id}
                  timeRemaining={gameState.turnTimeRemaining}
                  timeMax={gameState.turnTimerMax}
                  position="left"
                />
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
                      {gameState.players.length < 4
                        ? `Saat ini ada ${gameState.players.length} pemain. Kursi kosong akan diisi AI Bot secara otomatis.`
                        : 'Semua 4 pemain telah siap di meja!'}
                    </p>

                    {me?.isHost ? (
                      <button
                        onClick={onStartGame}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition-all text-sm"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Mulai Permainan (Bagi Kartu)</span>
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
                  />
                )}
              </div>

              {/* Right Seat (Opponent 3) */}
              <div className="w-24 sm:w-28 flex justify-center">
                <PlayerSeat
                  player={rightPlayer}
                  isCurrentTurn={gameState.currentTurnPlayerId === rightPlayer?.id}
                  timeRemaining={gameState.turnTimeRemaining}
                  timeMax={gameState.turnTimerMax}
                  position="right"
                />
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
              />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Player Hand & Action Controls */}
      {gameState.status === 'playing' && me && (
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
          />
        </footer>
      )}
    </div>
  );
};
