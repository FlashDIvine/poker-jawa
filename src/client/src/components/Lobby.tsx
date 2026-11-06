import React, { useState, useEffect } from 'react';
import { RoomListItem, GameRules, DEFAULT_RULES } from '@shared/types.js';
import { Play, Plus, LogIn, BookOpen, Volume2, VolumeX, Sparkles, RefreshCw, Maximize, Minimize } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { CreateRoomForm } from './CreateRoomModal.js';

interface LobbyProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  playerAvatar: string;
  onPlayerAvatarChange: (avatar: string) => void;
  onCreateRoom: (roomName: string, fillWithBots: boolean, turnTimerSeconds: number, maxPlayers: number, rules: GameRules) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRules: () => void;
}

const AVATAR_OPTIONS = ['🤠', '🥷', '🧙‍♂️', '🦊', '🐯', '🦁', '🐼', '🐲', '🦅', '🚀', '💎', '👑'];

const SERVER_URL = ((import.meta.env.VITE_SERVER_URL as string) || '').replace(/\/$/, '');

export const Lobby: React.FC<LobbyProps> = ({
  playerName,
  onPlayerNameChange,
  playerAvatar,
  onPlayerAvatarChange,
  onCreateRoom,
  onJoinRoom,
  onOpenRules
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<RoomListItem[]>([]);
  const [isMuted, setIsMuted] = useState(!sounds.enabled);
  const [loadingRooms, setLoadingRooms] = useState(false);
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

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`);
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data);
      }
    } catch (e) {
      // offline or proxied
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const enabled = sounds.toggle();
    setIsMuted(!enabled);
  };

  // Quick Play 1-click vs 3 Bots with Default Remi rules
  const handleQuickPlay = () => {
    onCreateRoom(`Solo Meja ${playerName}`, true, 15, 4, { ...DEFAULT_RULES });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Top Utility Bar (Sound, Rules) */}
      <div className="w-full flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl text-amber-400">🎴</span>
          <span className="font-extrabold tracking-wider text-xs uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full">
            Indonesian Poker Remi & Poker Jawa
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow cursor-pointer transition-all active:scale-95"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Landscape)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-slate-300" />}
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow cursor-pointer transition-all active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Aturan Main</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow cursor-pointer transition-all active:scale-95"
            title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-6xl font-black font-serif-poker tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent drop-shadow-md">
          POKER REMI
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
          Capsa Banting Multi-pemain Real-time (2 - 10 Orang) dengan Aturan Default Remi & Setelan Aturan Poker Jawa Lengkap.
        </p>
      </div>

      {/* Player Profile Setup Box */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl mb-8 backdrop-blur-md">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
          Profil Pemain
        </label>
        <div className="flex items-center gap-3">
          {/* Avatar Picker */}
          <div className="relative group">
            <button
              type="button"
              className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center text-3xl shadow cursor-pointer hover:border-amber-400 transition-all"
            >
              {playerAvatar}
            </button>
          </div>

          {/* Name Input */}
          <div className="flex-1">
            <input
              type="text"
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              placeholder="Masukkan Nama Anda..."
              maxLength={20}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Avatar Selection Chips */}
        <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto pb-1">
          {AVATAR_OPTIONS.map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => onPlayerAvatarChange(av)}
              className={`p-1.5 rounded-xl text-xl hover:bg-slate-800 transition-all cursor-pointer ${
                playerAvatar === av ? 'bg-amber-500/20 ring-2 ring-amber-400' : ''
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Play Modes Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Card 1: Quick Play vs 3 AI Bots */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none text-8xl">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Instan / Uji Coba Cepat</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
              Main Solo vs 3 AI Bot
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Mulai langsung tanpa menunggu teman. AI pintar dengan strategi banting, bom, dan patah kartu siap menantangmu!
            </p>
          </div>

          <button
            onClick={handleQuickPlay}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Mulai Main Sekarang (Aturan Default)</span>
          </button>
        </div>

        {/* Card 2: Join by Room Code */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <LogIn className="w-4 h-4" />
              <span>Gabung Teman</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
              Masukkan Kode Meja
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Punya 4 digit kode meja dari teman? Masukkan di bawah untuk langsung duduk di meja yang sama.
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Contoh: 7K9P"
              maxLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 uppercase"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow transition-all active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Gabung Meja</span>
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Create Custom Room & Public Rooms List */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Create Custom Room */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Plus className="w-4 h-4" />
            <span>Kustomisasi Meja & Aturan</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-4">
            Buat Meja Baru (2 - 10 Pemain)
          </h3>

          <CreateRoomForm
            onCreateRoom={(opts) => {
              onCreateRoom(opts.roomName, opts.fillWithBots, opts.turnTimerSeconds, opts.maxPlayers, opts.rules);
            }}
            defaultPlayerName={playerName}
          />
        </div>

        {/* Public Rooms List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <span>Daftar Meja Terbuka</span>
              </div>
              <button
                onClick={fetchRooms}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                title="Segarkan daftar meja"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {publicRooms.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Belum ada meja terbuka. Buat meja baru atau coba Main Solo!
                </div>
              ) : (
                publicRooms.map((room: RoomListItem) => {
                  const ruleBadge = room.rules?.preset === 'poker_jawa'
                    ? { label: 'Poker Jawa', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                    : room.rules?.preset === 'custom'
                    ? { label: 'Kustom', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
                    : { label: 'Default Remi', color: 'bg-slate-700 text-slate-300 border-slate-600' };

                  return (
                    <div
                      key={room.roomId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 block truncate max-w-[130px]">
                            {room.roomName}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${ruleBadge.color}`}>
                            {ruleBadge.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400/80 font-mono">
                          Kode: {room.roomId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {room.playerCount}/{room.maxPlayers} pemain
                        </span>
                        <button
                          onClick={() => onJoinRoom(room.roomId)}
                          disabled={room.playerCount >= room.maxPlayers}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer transition-all"
                        >
                          {room.playerCount >= room.maxPlayers ? 'Penuh' : 'Masuk'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center mt-4 pt-3 border-t border-slate-800">
            Mendukung 2 hingga 10 pemain dengan aturan Remi Default &amp; Poker Jawa.
          </div>
        </div>
      </div>
    </div>
  );
};
