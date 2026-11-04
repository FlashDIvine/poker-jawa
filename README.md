# 🃏 Poker Remi Indonesia (Capsa Banting) - Web Multiplayer Real-time

Permainan kartu Web Multiplayer Real-time berbasis varian khas **Poker Remi / Capsa Banting Indonesia**. Dilengkapi dengan backend Socket.io, frontend interaktif bergaya meja kasino hijau (felt table), AI bot cerdas, penghitung waktu giliran, serta efek suara prosedural Web Audio API.

---

## 🌟 Fitur Utama

1. **Aturan Otentik Poker Remi / Capsa Banting**:
   - **52 Kartu** dibagikan habis ke 4 pemain (masing-masing 13 kartu).
   - **Pembuka Permainan (3 Waru / 3♠)**: Pemain yang memegang 3♠ wajib jalan pertama dan kombinasi pembuka harus memuat kartu 3♠.
   - **Hierarki Angka**: `3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < As < 2 ("Poker")`.
   - **Hierarki Kembang (Suit)**: `♠ Waru/Sekop (1) < ♣ Keriting (2) < ♦ Wajik (3) < ♥ Hati (4)`.
   - **Mekanik Patah & Bom Khusus**:
     - Kartu **2 ("Poker")** adalah satuan tertinggi, namun dapat di-bom/dipatahkan oleh **"Bong"** (Four of a Kind atau 4-card Straight Flush).
     - Kartu **As** tunggal dapat dipatahkan oleh: As lebih tinggi, Poker (2), Tris (3 sejenis), atau Full House!
     - **Bong Straight Flush** mengalahkan **Bong Four of a Kind**.
     - **Full House** adalah satu-satunya kombinasi 5-kartu sah (diadu berdasarkan nilai Tris-nya).
   - **Denda Penalti Poker**: Pemain yang masih memegang kartu 2 ("Poker") saat ada pemain lain yang habis dikenakan penalti poin lipat ganda!

2. **Mode Permainan**:
   - **Main Instan vs 3 AI Bot (1 Klik)**: Langsung main solo tanpa menunggu teman. AI pintar otomatis mengambil keputusan taktis (banting, patah kartu, dan passing strategis).
   - **Buat Meja Kustom**: Pengaturan nama meja, pengisian kursi kosong dengan bot otomatis, dan durasi giliran (10s, 15s, 20s).
   - **Gabung Meja (Kode Room)**: Masukkan 4 karakter kode meja untuk bermain bersama teman.
   - **Daftar Meja Terbuka (Public Lobby)**: Lihat dan gabung langsung ke meja yang sedang menunggu.

3. **Interaktivitas Meja**:
   - Tampilan meja felt kasino responsif dengan 4 posisi pemain (Bawah, Kiri, Atas, Kanan).
   - Tampilan kartu elegan dengan efek angkat kartu saat dipilih, badge khusus untuk **3♠ (START)**, **AS**, dan **POKER**.
   - Timer bar & ring animasi countdown giliran.
   - Tombol **"Saran / Bantuan"** otomatis untuk merekomendasikan langkah menang terbaik.
   - Fitur urutkan kartu: berdasarkan **Angka (Rank)** atau **Kembang (Suit)**.
   - Efek suara prosedural Web Audio API (shuffle, banting slam, centang pass, dan fanfare kemenangan tanpa file audio eksternal).
   - Obrolan langsung (Chat) & tombol stiker/emote cepat (*"Banting! 💥"*, *"Poker! 🔥"*, *"Bong! 💣"*, *"Ampun suhu! 🙏"*).
   - Layar podium juara dengan animasi konfeti.

---

## 🛠️ Arsitektur & Teknologi

- **Backend**: Node.js, Express, Socket.io, TypeScript.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Canvas-confetti.
- **Shared Logic**:
  - `src/shared/deck.ts`: Pembuatan dek, pengocokan, pembagian kartu, pencarian 3 Waru.
  - `src/shared/engine.ts`: Evaluasi kombinasi (Satuan, Pair, Tris, Bong, Full House) dan validasi patah/banting kartu.
  - `src/shared/bot.ts`: Algoritma AI bot cerdas dengan evaluasi langkah legal dan prioritas taktis.
- **Testing**: Vitest (Unit tests, engine validation, 30+ simulasi pertandingan lengkap tanpa deadlock, WebSocket integration test).

---

## 🚀 Cara Menjalankan

### 1. Instalasi Ketergantungan
```bash
npm install
```

### 2. Menjalankan Mode Pengembangan (Development)
Jalankan server backend (port 3001) dan client frontend Vite (port 5173):
```bash
# Terminal 1: Backend Server
npm run dev

# Terminal 2: Frontend Client (dengan Vite HMR)
npm run client
```
Buka browser di `http://localhost:5173`.

### 3. Menjalankan Mode Produksi (Single Server)
```bash
# Build frontend
npm run build

# Jalankan server produksi
npm start
```
Buka browser di `http://localhost:3001`.

---

## 🧪 Menjalankan Tes
Proyek ini dilengkapi dengan 29 tes menyeluruh mencakup seluruh aturan kartu dan simulasi permainan:
```bash
npm test
```
Tes meliputi:
- `tests/deck.test.ts`: Pembuatan 52 kartu, pengacakan, pembagian 13 kartu per pemain, pencarian 3 Waru.
- `tests/engine.test.ts`: Pengenalan kombinasi, hierarki angka/kembang, patah kartu As, bom Poker 2 oleh Bong, penolakan 5-kartu selain Full House.
- `tests/bot.test.ts`: Keputusan langkah bot, pencarian kombinasi, pembuka 3 Waru.
- `tests/simulation.test.ts`: Simulasi 30 pertandingan lengkap dari awal hingga habis kartu untuk menjamin 0 deadlock dan konsistensi aturan.
- `tests/server.test.ts`: Pengujian integrasi REST API dan Socket.IO real-time.
