import React from 'react';
import { X, BookOpen, Flame, ShieldAlert, Award } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold text-slate-100">
              Panduan Aturan Poker Remi / Capsa Banting
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-2 py-4 space-y-4 text-sm text-slate-300">
          {/* Rule 1: Starting Lead */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-base mb-1">
              <Award className="w-4 h-4" />
              <span>1. Pembukaan Permainan (3 Waru / 3♠)</span>
            </div>
            <p>
              Setiap pemain dibagikan 13 kartu (total 52 kartu). Pemain yang memegang <strong className="text-amber-300">3 Waru (3♠)</strong> wajib jalan pertama untuk membuka permainan. Langkah pembuka harus memuat kartu 3 Waru tersebut (bisa berupa satuan 3♠, pair 3, tris 3, dst).
            </p>
          </div>

          {/* Rule 2: Hierarchy */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="font-bold text-amber-400 text-base mb-1">
              2. Hierarki Nilai Kartu
            </div>
            <div className="space-y-1.5">
              <p>
                <strong>Urutan Angka (Rendah ke Tinggi):</strong><br />
                <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded text-amber-300 inline-block mt-0.5">
                  3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; As (Ace) &lt; 2 ("Poker")
                </span>
              </p>
              <p>
                <strong>Urutan Kembang / Suit (Rendah ke Tinggi):</strong><br />
                <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded text-emerald-400 inline-block mt-0.5">
                  ♠ Waru/Sekop &lt; ♣ Keriting &lt; ♦ Wajik &lt; ♥ Hati
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Kartu <strong>3♠</strong> adalah kartu terendah di seluruh dek, dan kartu <strong>2♥</strong> adalah satuan tertinggi di dek.
              </p>
            </div>
          </div>

          {/* Rule 3: Combinations */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="font-bold text-amber-400 text-base mb-1">
              3. Kombinasi Kartu yang Diizinkan
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-200">
              <li><strong>Satuan (1 kartu):</strong> Kartu tunggal.</li>
              <li><strong>Pair (2 kartu):</strong> 2 kartu berangka sama (contoh: 7♠ 7♥).</li>
              <li><strong>Tris (3 kartu):</strong> 3 kartu berangka sama (contoh: 9♠ 9♣ 9♥).</li>
              <li><strong>Bong (4 kartu):</strong> 4 kartu kembar (Four of a Kind) ATAU 4-card Straight Flush (4 kartu berurutan kembang sama).</li>
              <li><strong>Full House (5 kartu):</strong> 3 kartu sejenis + 1 pasang (contoh: 8-8-8-4-4). <em>Full House adalah satu-satunya kombinasi 5 kartu yang sah.</em></li>
            </ul>
          </div>

          {/* Rule 4: Special Counters */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 to-amber-950/40 border border-rose-500/40">
            <div className="flex items-center gap-2 font-bold text-rose-400 text-base mb-1">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>4. Aturan Banting / Patah Spesial</span>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <strong className="text-indigo-400">Patah Kartu As (Ace):</strong>
                <p className="text-xs text-slate-300 mt-0.5">
                  Kartu As tunggal dapat dilawan dengan: <strong>As kembang lebih tinggi</strong>, <strong>Poker (2)</strong>, <strong>Tris (3 sejenis)</strong>, atau <strong>Full House</strong>!
                </p>
              </div>

              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <strong className="text-amber-400">Bom Kartu Poker (2):</strong>
                <p className="text-xs text-slate-300 mt-0.5">
                  Kartu 2 ("Poker") adalah kartu satuan terkuat, namun dapat di-bom/dikalahkan oleh <strong className="text-rose-400">"Bong"</strong> (Four of a Kind atau Straight Flush 4 kartu)!
                </p>
              </div>

              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <strong className="text-emerald-400">Lawan Full House & Bong:</strong>
                <p className="text-xs text-slate-300 mt-0.5">
                  Full House hanya dapat dilawan oleh Full House yang memiliki tris lebih tinggi. Bong Straight Flush mengalahkan Bong Four of a Kind.
                </p>
              </div>
            </div>
          </div>

          {/* Rule 5: Turn flow & Passing */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-base mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>5. Giliran Searah Jarum Jam & Lewat (Pass)</span>
            </div>
            <p>
              Giliran berjalan searah jarum jam. Pemain yang tidak bisa atau memilih tidak melawan dapat mengklik tombol <strong>Lewat</strong>. Jika 3 pemain lawan berturut-turut Lewat, babak berakhir dan pemain terakhir yang berhasil mengeluarkan kartu berhak memimpin babak baru dengan meja kosong!
            </p>
          </div>

          {/* Rule 6: Win Condition */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="font-bold text-amber-400 text-base mb-1">
              6. Kemenangan & Skor Penalti
            </div>
            <p>
              Pemain pertama yang kartu di tangannya habis (0 kartu) memenangkan permainan! Pemain lain mendapatkan poin penalti berdasarkan sisa kartu. <em>Catatan: Pemain yang masih memegang kartu Poker (2) saat lawan habis akan dikenakan denda penalti lipat ganda!</em>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow cursor-pointer transition-all"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
