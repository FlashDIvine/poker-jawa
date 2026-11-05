# 🎴 Poker Jawa (Capsa Banting / Poker Remi Indonesia) - Web Multiplayer Real-time

Permainan kartu Web Multiplayer Real-time berbasis varian khas **Poker Jawa / Capsa Banting / Remi Indonesia**. Dilengkapi dengan backend Socket.io, frontend interaktif bergaya meja kasino hijau (felt table), AI bot cerdas, penghitung waktu giliran, serta efek suara prosedural Web Audio API.

---

## 🌟 Fitur Utama

1. **Aturan Otentik Poker Remi / Capsa Banting**:
   - **Strictly 1 Dek (52 Kartu)** selalu digunakan dan dibagi habis ke seluruh pemain di meja (2 hingga 10 pemain).
   - **Pembuka Permainan & Buang Angka 3 ("di awal game semua angka 3 dibuang dan pemegang 3♠ jalan duluan")**: Di awal permainan, pemain yang memegang 3 Waru (3♠) ditentukan sebagai pembuka langkah pertama, lalu seluruh kartu angka 3 dibuang secara otomatis dari tangan setiap pemain (tersisa 48 kartu aktif di meja). Pemain pembuka bebas mengeluarkan kombinasi sah pertama dari sisa kartunya.
   - **Aturan Tidak Boleh Tabrak Kartu yang Sama**: Kartu tidak boleh ditabrak/dilawan dengan angka yang sama (misal: 8 tidak boleh ditabrak 8; pair 8 tidak boleh ditabrak pair 8). Harus mengeluarkan angka yang lebih tinggi (9, 10, dst)!
   - **Hierarki Angka**: `3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < As < 2 ("Poker")`.
   - **Hierarki Kembang (Suit)**: `♠ Waru/Sekop (1) < ♣ Keriting (2) < ♦ Wajik (3) < ♥ Hati (4)`.
   - **Aturan Mutlak Pair (2 Kartu Kembar)**: Meja Pair **HANYA boleh dilawan dengan Pair juga** yang angkanya lebih tinggi! Pair tidak bisa ditabrak/dipatahkan oleh Tris, Full House, atau Bong.
   - **Mekanik Patah & Bom Khusus**:
     - Kartu **Satuan 2 ("Poker")** adalah kartu tunggal tertinggi, namun dapat dipatahkan/di-bom oleh: **Tris** (kembar 3), **Full House**, atau **"Bong"** (Four of a Kind atau 4-card Straight Flush).
     - Kartu **Satuan As** dapat dipatahkan oleh: Poker (2), **Tris** (kembar 3), atau **Full House**!
     - **Bong Straight Flush** mengalahkan **Bong Four of a Kind**.
     - **Full House** adalah satu-satunya kombinasi 5-kartu sah (diadu berdasarkan nilai Tris-nya).
    - **Denda Penalti Poker**: Pemain yang masih memegang kartu 2 ("Poker") saat ada pemain lain yang habis dikenakan penalti poin lipat ganda!

2. **Dukungan Aturan Fleksibel & Poker Jawa**:
   - **Mode Default (Remi)**: Tetap menjadi aturan baku bawaan (Satuan, Pair, Tris, Bong 4 kartu, Bong SF 4 kartu, Full House, Aturan Mutlak Pair, Dilarang tabrak angka sama, pembuka 3 Waru 3♠).
   - **Mode Poker Jawa (Aturan Tradisional)**: Sesuai aturan khas Poker Jawa (https://oldblog.rizkyaulya.info/2007/08/poker-jawa-permainan-kartu-paling.html):
     - Hierarki Kembang: `♠ Sekop > ♥ Hati > ♣ Keriting > ♦ Wajik`.
     - Pembuka putaran pertama: **3 Wajik (3♦)** jika aturan buang 3 dinonaktifkan, atau **3 Waru (3♠)** saat aturan buang 3 aktif.
     - Boleh tabrak kartu berangka sama jika kembangnya lebih tinggi.
     - Hierarki Paket 5 Kartu: Seri (Straight) < Colour (Flush) < Full House (Polo) < Split (Piting: Color 3 kartu + Pair) < Flush (Straight Flush) < Royal Straight Flush.
     - Kombinasi Khusus: **Brother** (2 pasang pair berurutan), **Brother Panjang** (3 pasang pair berurutan), **Color Tris** (3 kartu sejenis kembang berurutan memotong Tris biasa).
     - Sistem Bom: 4 of a Kind menge-bom Satuan 2; Straight Flush menge-bom Satuan 2, Pair 2, dan 4 of a Kind; Royal Straight Flush memotong segalanya.
   - **Mode Kustom**: Pembuat ruangan dapat mengatur kombinasi kartu yang diizinkan secara bebas.

3. **Fleksibilitas 2 hingga 10 Pemain**:
   - Bebas bermain mulai dari 2 orang (duel 1 vs 1), bertiga, berempat, hingga 10 pemain.
   - Manajemen kartu: strictly 1 deck (52 kartu) selalu untuk seluruh jumlah pemain (2-10 orang).
   - Tampilan meja felt adaptif dinamis mendistribusikan lawan di sisi luar felt meja (kiri, atas, dan kanan) agar meja lebih lega dan ergonomis untuk ponsel.

4. **Mode Permainan & Lobi**:
   - **Main Instan vs AI Bot (1 Klik)**: Langsung main solo tanpa menunggu teman. AI pintar otomatis mengambil keputusan taktis sesuai aturan yang aktif.
   - **Buat Meja Kustom**: Pengaturan nama meja, kapasitas pemain (2-10 orang), pilihan preset aturan (Default, Poker Jawa, Kustom), bot otomatis, dan durasi giliran.
   - **Gabung Meja (Kode Room)**: Masukkan kode meja untuk bermain bersama teman.
   - **Daftar Meja Terbuka (Public Lobby)**: Lihat status meja, jumlah pemain, dan preset aturan yang aktif.

---

## 🛠️ Arsitektur & Teknologi

- **Backend**: Node.js, Express, Socket.io, TypeScript.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Canvas-confetti.
- **Shared Logic**:
  - `src/shared/deck.ts`: Pembuatan dek strictly 1 deck (52 kartu), pengocokan, pembagian kartu 2-10 pemain, pencarian pembuka (3 Waru / 3 Wajik).
  - `src/shared/engine.ts`: Evaluasi kombinasi (Satuan, Pair, Tris, Bong, Full House, Straight, Colour, Split, Straight Flush, Royal Flush, Brother, Color Tris) dan validasi patah/banting kartu sesuai aturan meja.
  - `src/shared/bot.ts`: Algoritma AI bot cerdas dengan evaluasi langkah legal dan prioritas taktis sesuai aturan aktif.
- **Testing**: Vitest (suite tes unit komprehensif, evaluasi engine, Poker Jawa, simulasi 2-10 pemain, WebSocket integration test).

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
Proyek ini dilengkapi dengan tes menyeluruh mencakup seluruh varian aturan kartu, Poker Jawa, dan simulasi pertandingan:
```bash
npm test
```
Tes meliputi:
- `tests/deck.test.ts`: Pembuatan strictly 52 kartu (1 deck), pengacakan, pembagian kartu 2-10 pemain.
- `tests/pokerJawa.test.ts`: Pengujian lengkap kombinasi Poker Jawa, hierarki paket 5 kartu, Brother, Color Tris, sistem bom, dan pembuka 3 Wajik.
- `tests/multiplayer.test.ts`: Pembagian deck 2-10 pemain (strictly 52 kartu) dan simulasi pertandingan multi-pemain (5, 6, 8, 10 pemain).
- `tests/engine.test.ts`: Pengenalan kombinasi, hierarki angka/kembang, buang angka 3 di awal, patah kartu As, bom Poker 2 oleh Bong, penolakan kombinasi ilegal.
- `tests/bot.test.ts`: Keputusan langkah bot, pencarian kombinasi, pembuka permainan.
- `tests/simulation.test.ts`: Simulasi pertandingan lengkap dari awal hingga habis kartu untuk menjamin 0 deadlock.
- `tests/server.test.ts`: Pengujian integrasi REST API dan Socket.IO real-time (pembuangan angka 3, 3♠ starter, kebersihan obrolan, mode tanpa saran).
