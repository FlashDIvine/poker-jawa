import React, { useState } from 'react';
import { X, BookOpen, Flame, ShieldAlert, Award } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'default' | 'pokerJawa'>('default');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold text-slate-100">
              Panduan Aturan Permainan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 pt-3 pb-2 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('default')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'default'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Aturan Default (Remi)
          </button>
          <button
            onClick={() => setActiveTab('pokerJawa')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'pokerJawa'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Aturan Poker Jawa (Tradisional)
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-2 py-4 space-y-4 text-sm text-slate-300">
          {activeTab === 'default' ? (
            <>
              {/* Default Rule 1: Starting Lead */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2 font-bold text-amber-400 text-base mb-1">
                  <Award className="w-4 h-4" />
                  <span>1. Pembagian Kartu & Pembuka (3 Waru)</span>
                </div>
                <p>
                  Seluruh 52 kartu dibagikan habis secara adil untuk 2 hingga 10 pemain (misal: <strong className="text-amber-300">26 kartu per orang</strong> untuk duel 1 vs 1, atau <strong className="text-amber-300">13 kartu per orang</strong> jika 4 pemain). Pemain yang memegang <strong className="text-amber-300">3 Waru (3♠)</strong> wajib membuka giliran pertama dengan membuang kombinasi yang mengandung angka 3.
                </p>
              </div>

              {/* Default Rule 2: Hierarchy */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-amber-400 text-base mb-1">
                  2. Hierarki Nilai Kartu & Dilarang Tabrak Kartu Sama
                </div>
                <div className="space-y-1.5">
                  <p>
                    <strong>Urutan Angka (Rendah ke Tinggi):</strong><br />
                    <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded text-amber-300 inline-block mt-0.5">
                      3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; As (Ace) &lt; 2 ("Poker")
                    </span>
                  </p>
                  <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs mt-1">
                    <strong>⚠️ Tidak Boleh Tabrak Kartu yang Sama:</strong> Kartu tidak boleh ditabrak/dilawan dengan angka yang sama (misal: kartu 8 tidak boleh ditabrak kartu 8; pair 8 tidak boleh ditabrak pair 8). Harus mengeluarkan angka yang lebih tinggi (9, 10, dst)!
                  </div>
                </div>
              </div>

              {/* Default Rule 3: Combinations */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-amber-400 text-base mb-1">
                  3. Kombinasi Kartu yang Diizinkan
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-200">
                  <li><strong>Satuan (1 kartu):</strong> Kartu tunggal.</li>
                  <li><strong>Pair (2 kartu):</strong> 2 kartu berangka sama (contoh: 7♠ 7♥).</li>
                  <li><strong>Tris (3 kartu):</strong> 3 kartu berangka sama (contoh: 9♠ 9♣ 9♥).</li>
                  <li><strong>Bong (4 kartu):</strong> 4 kartu kembar (Four of a Kind) ATAU 4-card Straight Flush (4 kartu berurutan kembang sama).</li>
                  <li><strong>Full House (5 kartu):</strong> 3 kartu sejenis + 1 pasang (contoh: 8-8-8-4-4). <em>Full House adalah satu-satunya kombinasi 5 kartu yang sah pada mode default.</em></li>
                </ul>
              </div>

              {/* Default Rule 4: Special Counters & Absolute Pair Rule */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 to-amber-950/40 border border-rose-500/40">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-base mb-1">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>4. Aturan Mutlak Pair & Patah Spesial</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-amber-500/30">
                    <strong className="text-amber-300">★ Aturan Mutlak Pair:</strong>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Jika meja mengeluarkan <strong>Pair (2 kartu kembar)</strong>, maka <strong>HANYA boleh dilawan dengan Pair juga</strong> yang angkanya lebih tinggi! Pair tidak bisa ditabrak oleh Tris, Full House, maupun Bong.
                    </p>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <strong className="text-indigo-400">Patah Kartu Satuan As (Ace):</strong>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Kartu Satuan As dapat dilawan dengan: <strong>Poker (2)</strong>, <strong>Tris (kembar 3)</strong>, atau <strong>Full House</strong>!
                    </p>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <strong className="text-amber-400">Bom Kartu Satuan Poker (2):</strong>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Kartu Satuan 2 (&quot;Poker&quot;) adalah kartu tunggal tertinggi dan <strong className="text-yellow-300">TIDAK BISA</strong> dikalahkan oleh Tris! Kartu 2 hanya bisa dipatahkan/di-bom oleh <strong className="text-rose-400">&quot;Bong&quot;</strong> (Four of a Kind atau Straight Flush 4 kartu)!
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Rule 5: Poker 2 Last Card Rule */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 to-slate-800/60 border border-red-500/40">
                <div className="flex items-center gap-2 font-bold text-red-400 text-base mb-1">
                  <span>👎</span>
                  <span>5. Larangan Kartu 2 (Poker) Terakhir & Kalah Telak</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pemain <strong className="text-rose-300">dilarang keras memegang kartu 2 (Poker) sebagai kartu terakhir</strong> di tangan, serta dilarang menutup/memenangkan permainan menggunakan kartu 2. Apabila seorang pemain hanya menyisakan kartu 2 di tangannya, pemain tersebut <strong className="text-yellow-300">LANGSUNG DINYATAKAN KALAH TELAK (Kena Booing)</strong> dan seluruh pemain lawan <strong className="text-emerald-300">LANGSUNG MENANG</strong>!
                </p>
              </div>

              {/* Default Rule 6: Kena BONG Langsung Mati */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-red-950/40 to-slate-800/60 border border-rose-500/50">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-base mb-1">
                  <span>💣</span>
                  <span>6. Kena BONG Langsung Mati (Aturan Tongkrongan)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jika seorang pemain mengeluarkan <strong className="text-amber-300">kartu 2 (Poker)</strong> — baik Satuan 2 maupun Pair 2 — lalu pemain lain <strong className="text-rose-400">memotongnya dengan BONG</strong> (Four of a Kind atau Straight Flush), pemain pemegang kartu 2 tersebut <strong className="text-yellow-300">LANGSUNG MATI / KALAH INSTAN</strong> seketika! Ronde langsung berakhir, pemain tersebut menjadi juru kunci dengan penalti denda minus lipat ganda!
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Poker Jawa Rule 1: Setup & Starter */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2 font-bold text-amber-400 text-base mb-1">
                  <Award className="w-4 h-4" />
                  <span>1. Jumlah Pemain Bebas (2 - 10 Orang) & Pembuka 3 Wajik (3♦)</span>
                </div>
                <p>
                  Bisa dimainkan secara fleksibel dari <strong className="text-amber-300">2 hingga 10 orang pemain</strong> menggunakan <strong className="text-amber-300">1 dek standar (52 kartu)</strong> yang dibagi habis ke seluruh pemain di meja. Pemain yang memegang kartu pembuka berhak membuka langkah pertama.
                </p>
              </div>

              {/* Poker Jawa Rule 2: Suit Hierarchy */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-amber-400 text-base mb-1">
                  2. Hierarki Kembang & Boleh Tabrak Angka Sama
                </div>
                <div className="space-y-1.5">
                  <p>
                    <strong>Urutan Kembang (Tinggi ke Rendah):</strong><br />
                    <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded text-amber-300 inline-block mt-0.5">
                      ♠ Sekop (Spade) &gt; ♥ Hati (Heart) &gt; ♣ Keriting (Club) &gt; ♦ Wajik (Diamond)
                    </span>
                  </p>
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs mt-1">
                    <strong>Boleh Tabrak Angka Sama:</strong> Jika kartu berangka sama dikeluarkan, pemain dapat melawannya dengan angka yang sama asalkan kembangnya lebih tinggi (contoh: K Sekop ♠ mengalahkan K Hati ♥; Pair 8 Hati+Sekop mengalahkan Pair 8 Wajik+Keriting).
                  </div>
                </div>
              </div>

              {/* Poker Jawa Rule 3: 5-Card Paket Hierarchy */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-amber-400 text-base mb-1">
                  3. Tingkatan Kombinasi 5 Kartu (&quot;Paket&quot;)
                </div>
                <p className="text-xs text-slate-300 mb-2">
                  Kombinasi 5 kartu yang lebih tinggi tingkatannya dapat memotong paket yang lebih rendah:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                  <li><strong className="text-slate-100">Level 1: Straight / Seri</strong> — 5 kartu berurutan tidak sejenis kembang (contoh: 4-5-6-7-8).</li>
                  <li><strong className="text-slate-100">Level 2: Colour / Flush</strong> — 5 kartu sejenis kembang tetapi tidak berurutan.</li>
                  <li><strong className="text-slate-100">Level 3: Full House / Polo</strong> — 3 kartu kembar + 1 pasang (contoh: 8-8-8-4-4).</li>
                  <li><strong className="text-slate-100">Level 4: Split / Piting</strong> — 3 kartu sejenis kembang berurutan + 1 pair berangka sama (contoh: 4♥ 5♥ 6♥ + 9♠ 9♦).</li>
                  <li><strong className="text-rose-300">Level 5: Flush / Straight Flush</strong> — 5 kartu berurutan dengan kembang yang sama (contoh: 5♠ 6♠ 7♠ 8♠ 9♠).</li>
                  <li><strong className="text-amber-300">Level 6: Royal Straight Flush</strong> — 10-J-Q-K-As dengan kembang yang sama (kombinasi 5 kartu tertinggi!).</li>
                </ol>
              </div>

              {/* Poker Jawa Rule 4: Special Combos */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="font-bold text-amber-400 text-base mb-1">
                  4. Kombinasi Khusus Lainnya
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200">
                  <li><strong className="text-amber-300">Brother (4 kartu):</strong> 2 pasang pair berurutan (contoh: Pair 7 dan Pair 8).</li>
                  <li><strong className="text-amber-300">Brother Panjang (6 kartu):</strong> 3 pasang pair berurutan (contoh: Pair 5, Pair 6, dan Pair 7).</li>
                  <li><strong className="text-amber-300">Color Tris (3 kartu):</strong> 3 kartu sejenis kembang dan berurutan (contoh: 5♠ 6♠ 7♠). Dapat memotong Tris biasa!</li>
                  <li><strong className="text-rose-400">Piting / 4 of a Kind (4 kartu):</strong> 4 kartu berangka sama (misal: 4 buah As atau 4 buah 9).</li>
                </ul>
              </div>

              {/* Poker Jawa Rule 5: Bombs / Cuts */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 to-amber-950/40 border border-rose-500/40">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-base mb-1">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>5. Sistem Bom & Patah Poker Jawa</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <strong className="text-rose-400">Piting (4 of a Kind):</strong> Menge-bom kartu Satuan 2!
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <strong className="text-amber-400">Straight Flush (Level 5):</strong> Menge-bom Satuan 2, Pair 2, dan bahkan Piting (4 of a Kind)!
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <strong className="text-amber-300">Royal Straight Flush (Level 6):</strong> Mengalahkan segala kartu di meja!
                  </div>
                </div>
              </div>

              {/* Poker Jawa Rule 6: Poker 2 Last Card Rule */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 to-slate-800/60 border border-red-500/40">
                <div className="flex items-center gap-2 font-bold text-red-400 text-base mb-1">
                  <span>👎</span>
                  <span>6. Larangan Kartu 2 (Poker) Terakhir & Kalah Telak</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pemain dilarang memegang kartu 2 sebagai kartu terakhir di tangan. Jika hanya tersisa kartu 2 di tangan pemain, pemain tersebut <strong className="text-yellow-300">LANGSUNG KALAH TELAK</strong> dan pemain lain langsung menang!
                </p>
              </div>

              {/* Poker Jawa Rule 7: Kena BONG Langsung Mati */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-red-950/40 to-slate-800/60 border border-rose-500/50">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-base mb-1">
                  <span>💣</span>
                  <span>7. Kena BONG Langsung Mati (Aturan Tongkrongan)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jika mengeluarkan kartu 2 (Satuan 2 atau Pair 2) lalu dipotong oleh BONG (Four of a Kind atau Straight Flush), pemain tersebut <strong className="text-yellow-300">LANGSUNG MATI / KALAH TELAK</strong> seketika! Ronde selesai seketika dan penalti minus lipat ganda!
                </p>
              </div>
            </>
          )}

          {/* Common Turn Flow & Passing */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-base mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Putaran & Tombol Lewat (Pass)</span>
            </div>
            <p>
              Giliran berjalan memutar searah jarum jam. Pemain yang memilih lewat dapat kembali bertarung saat giliran berputar lagi jika ada kartu baru di meja. Ketika seluruh lawan berturut-turut Lewat, pemain terakhir yang mengeluarkan kartu berhak memimpin babak baru dengan meja bersih!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow cursor-pointer transition-all"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
