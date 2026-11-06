import React, { useState } from 'react';
import { GameRules, DEFAULT_RULES, POKER_JAWA_RULES } from '@shared/types.js';
import { Settings2, Users, Plus, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (options: {
    roomName: string;
    maxPlayers: number;
    fillWithBots: boolean;
    turnTimerSeconds: number;
    rules: GameRules;
  }) => void;
  defaultPlayerName?: string;
}

export const CreateRoomForm: React.FC<{
  onCreateRoom: (options: {
    roomName: string;
    maxPlayers: number;
    fillWithBots: boolean;
    turnTimerSeconds: number;
    rules: GameRules;
  }) => void;
  defaultPlayerName?: string;
  onClose?: () => void;
}> = ({ onCreateRoom, defaultPlayerName = 'Pemain', onClose }) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [fillBots, setFillBots] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [rules, setRules] = useState<GameRules>({ ...DEFAULT_RULES });
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);

  const handlePresetChange = (preset: 'default_remi' | 'poker_jawa' | 'custom') => {
    if (preset === 'default_remi') {
      setRules({ ...DEFAULT_RULES, preset: 'default_remi' });
    } else if (preset === 'poker_jawa') {
      setRules({ ...POKER_JAWA_RULES, preset: 'poker_jawa' });
    } else {
      setRules(prev => ({ ...prev, preset: 'custom' }));
      setShowAdvancedRules(true);
    }
  };

  const updateRuleField = <K extends keyof GameRules>(key: K, value: GameRules[K]) => {
    setRules(prev => ({ ...prev, [key]: value, preset: 'custom' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      roomName: newRoomName.trim() || `Meja ${defaultPlayerName}`,
      maxPlayers,
      fillWithBots: fillBots,
      turnTimerSeconds: timerSeconds,
      rules: {
        ...rules,
        deckCount: 1 // Strictly 1 deck (52 cards) always
      }
    });
    if (onClose) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="text-slate-400 block mb-1 font-medium">Nama Meja</label>
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Contoh: Meja Juara Remi"
          maxLength={30}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Max Players Selector (2 to 10 players) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-slate-300 font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Kapasitas Pemain:</span>
            <span className="font-bold text-amber-300 text-sm">{maxPlayers} Orang</span>
          </label>
          <span className="text-[10px] text-slate-400">1 Dek (52 Kartu) dibagi habis</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-1">
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setMaxPlayers(num)}
              className={`py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                maxPlayers === num
                  ? 'bg-amber-500 text-slate-950 shadow ring-1 ring-amber-300'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Preset Tabs */}
      <div>
        <label className="text-slate-400 block mb-1.5 font-medium">Setelan Aturan & Kombinasi</label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handlePresetChange('default_remi')}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              rules.preset === 'default_remi'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Aturan bawaan Poker Remi / Capsa Banting (Satuan, Pair, Tris, Bong 4, Full House)"
          >
            Default (Remi)
          </button>
          <button
            type="button"
            onClick={() => handlePresetChange('poker_jawa')}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              rules.preset === 'poker_jawa'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Aturan Poker Jawa lengkap: Straight, Colour, Split, Straight Flush, Royal Flush, Brother, Color Tris"
          >
            Poker Jawa
          </button>
          <button
            type="button"
            onClick={() => handlePresetChange('custom')}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              rules.preset === 'custom'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pilih kombinasi dan mekanisme kartu sesuka hati"
          >
            Kustom
          </button>
        </div>
      </div>

      {/* Mode Tanpa Bantuan Saran (No-Hint Mode) - Prominent Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 text-xs">Mode Tanpa Saran (Pro / Manual)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300">
              {rules.allowHints === false ? 'AKTIF' : 'NONAKTIF'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Sembunyikan tombol bantuan saran kombinasi agar permainan murni strategi pemain.
          </span>
        </div>
        <input
          type="checkbox"
          id="no-hint-mode-toggle"
          checked={rules.allowHints === false}
          onChange={(e) => updateRuleField('allowHints', !e.target.checked)}
          className="w-5 h-5 accent-amber-500 cursor-pointer ml-2 shrink-0"
        />
      </div>

      {/* Advanced Combination Toggles Accordion */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <button
          type="button"
          onClick={() => setShowAdvancedRules(!showAdvancedRules)}
          className="w-full flex items-center justify-between text-xs font-semibold text-amber-400 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Detail Kombinasi & Mekanisme ({rules.preset === 'default_remi' ? 'Aturan Default' : rules.preset === 'poker_jawa' ? 'Aturan Poker Jawa' : 'Kustom'})</span>
          </span>
          {showAdvancedRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedRules && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Kombinasi Kartu Aktif</span>
            
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowStraight}
                  onChange={(e) => updateRuleField('allowStraight', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Straight (Seri 5)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowFlush}
                  onChange={(e) => updateRuleField('allowFlush', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Colour / Flush (5)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowFullHouse}
                  onChange={(e) => updateRuleField('allowFullHouse', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Full House (3+2)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowSplit}
                  onChange={(e) => updateRuleField('allowSplit', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Split (Color 3 + Pair)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowStraightFlush5}
                  onChange={(e) => updateRuleField('allowStraightFlush5', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Straight Flush (5)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowRoyalFlush}
                  onChange={(e) => updateRuleField('allowRoyalFlush', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Royal Straight Flush</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowBrother}
                  onChange={(e) => updateRuleField('allowBrother', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Brother (2 Pair - 4)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowBrotherPanjang}
                  onChange={(e) => updateRuleField('allowBrotherPanjang', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Brother Panjang (6)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowColorTris}
                  onChange={(e) => updateRuleField('allowColorTris', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Color Tris (3 SF)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowBongFour}
                  onChange={(e) => updateRuleField('allowBongFour', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Bong 4 of a Kind</span>
              </label>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block pt-2 border-t border-slate-800/80">Mekanisme Khusus</span>
            
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.allowCompareSuitsOnSameRank}
                  onChange={(e) => updateRuleField('allowCompareSuitsOnSameRank', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Adu Kembang jika Angka Sama (Sekop &gt; Hati &gt; Keriting &gt; Wajik)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.pairAbsoluteRule}
                  onChange={(e) => updateRuleField('pairAbsoluteRule', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Aturan Mutlak Pair (Pair hanya boleh dilawan Pair)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.cutAceWithTrisOrFH}
                  onChange={(e) => updateRuleField('cutAceWithTrisOrFH', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Patah As (Kartu As satuan bisa dipatahkan Tris / Full House)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.cutTwoWithTrisOrFH}
                  onChange={(e) => updateRuleField('cutTwoWithTrisOrFH', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Patah 2 (Opsional: Izinkan Tris / Full House kalahkan kartu 2)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.discardThrees !== false}
                  onChange={(e) => updateRuleField('discardThrees', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Buang Semua Angka 3 di Awal (Pemegang 3♠ Jalan Duluan)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.holdingPokerAsLastCardLoses !== false}
                  onChange={(e) => updateRuleField('holdingPokerAsLastCardLoses', e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span>Kalah Otomatis jika Sisa Kartu 2 (Pegang kartu 2 terakhir langsung kalah telak)</span>
              </label>

              <div className="flex items-center justify-between pt-1">
                <span>Kartu Pembuka Putaran Pertama:</span>
                <select
                  value={rules.openingCard}
                  onChange={(e) => updateRuleField('openingCard', e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px]"
                >
                  <option value="3S">3 Waru (3♠ - Default Remi)</option>
                  <option value="3D">3 Wajik (3♦ - Poker Jawa)</option>
                  <option value="any_3">Bebas Angka 3</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1 text-slate-400">
                <span>Dek Kartu:</span>
                <span className="font-semibold text-slate-300">1 Dek Standar (52 Kartu)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-slate-200 block">Isi Otomatis dengan Bot</span>
          <span className="text-[11px] text-slate-500">Isi kursi kosong dengan AI saat mulai</span>
        </div>
        <input
          type="checkbox"
          checked={fillBots}
          onChange={(e) => setFillBots(e.target.checked)}
          className="w-5 h-5 accent-amber-500 cursor-pointer"
        />
      </div>

      <div>
        <label className="text-slate-400 block mb-1 font-medium">Waktu Giliran (Detik)</label>
        <select
          value={timerSeconds}
          onChange={(e) => setTimerSeconds(Number(e.target.value))}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
        >
          <option value={10}>10 Detik (Cepat / Kilat)</option>
          <option value={15}>15 Detik (Standar)</option>
          <option value={20}>20 Detik (Santai)</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow transition-all active:scale-95 cursor-pointer mt-2"
      >
        <Plus className="w-4 h-4 text-emerald-400" />
        <span>Buat Meja ({maxPlayers} Pemain)</span>
      </button>
    </form>
  );
};

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  defaultPlayerName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Kustomisasi Meja & Aturan</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          Buat Meja Baru (2 - 10 Pemain)
        </h3>
        <CreateRoomForm
          onCreateRoom={onCreateRoom}
          defaultPlayerName={defaultPlayerName}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
