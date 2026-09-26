# Football Manager 2024 (FM24) Team Analyzer & Tactical Engine v2

Sebuah alat analisis taktik dan simulasi pertandingan sepak bola komprehensif untuk **Football Manager 2024 (FM24)** yang beroperasi **100% di sisi klien (pure client-side)**.

---

## 🌟 Fitur Utama (Tactical Engine v2)

### 1. Alur Kerja 4 Tahap (Build → Diagnose → Improve → Compare)
- **1. Build**: Mengatur formasi, susunan 11 pemain starter, role, duty, instruksi tim (TI), dan instruksi individu pemain (PI).
- **2. Diagnose**: Menampilkan struktur taktis 4 fase, evaluasi Tactical Cohesion vs Data Confidence secara berdampingan, visualisasi 16 metrik taktis, serta 6 kategori temuan taktis berbobot aturan FM24 & Guide to Football.
- **3. Improve**: Rekomendasi kecocokan skuad (*Squad Fit Recommender*) berbasis Beam Search dengan preview perbedaan (*diff*) dan tombol **Terapkan Atomik** serta **Undo Taktik**.
- **4. Compare**: Simulasi Monte Carlo stress-testing di Sandbox menguji taktik Anda melawan 24 skenario pertandingan (8 arketipe taktik $\times$ 3 tingkat kapasitas lawan).

---

### 2. Pilar-Pilar Engine v2

- **Dynamic 4-Phase Tactical Shapes**:
  - `Base Shape`: Formasi dasar kick-off.
  - `In-Possession Shape`: Pergeseran dinamis pemain saat menguasai bola (misal: IFB merapat jadi 3 bek, IWB masuk sebagai gelandang tengah, Winger menusuk ke kotak penalti).
  - `Settled Defence Shape`: Bentuk blok pertahanan saat lawan menguasai bola (High Press, Mid-Block, atau Low Block).
  - `Rest Defence Shape`: Kerapatan pemain di belakang garis bola saat menyerang (struktur $3+2$, $2+3$, dll.).

- **16 Metrik Taktis Terkontekstualisasi (Skala 0–100)**:
  - Dimodulasi langsung oleh atribut relevan pemain di posisi starter (bukan nilai konstan atau tebakan seragam).

- **Hungarian Algorithm (Kuhn-Munkres) Optimizer**:
  - Menyelesaikan penugasan 11 starter secara optimal global $O(M \cdot N^2)$, menghindari perangkap *greedy* dan menghormati slot yang dikunci secara manual.

- **Sandbox Monte Carlo Match Engine (24 Skenario / 48.000 Pertandingan)**:
  - Simulasi berjalan di latar belakang menggunakan **HTML5 Web Worker** (dengan fallback synchronous otomatis).
  - PRNG deterministik **Mulberry32** untuk hasil yang konsisten pada seed yang sama.
  - Interval konfidensi **Wilson Score** untuk batas atas dan bawah statistik kemenangan.
  - **Deteksi Snapshot Kedaluwarsa (Stale)**: Melacak hash taktik; setiap perubahan sekecil apa pun pada formasi/instruksi akan memberi notifikasi bahwa hasil simulasi perlu diperbarui.

---

## 🚀 Memulai (Getting Started)

### Prasyarat
- [Node.js](https://nodejs.org) (v18+) atau [Bun](https://bun.sh) (v1.0+)

### Instalasi Dependensi
```bash
bun install
# atau
npm install
```

### Menjalankan Server Pengembangan
```bash
bun run dev
# atau
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## 🧪 Pengujian & Kualitas Kode

Proyek ini mempertahankan standar kualitas kode yang ketat (0 error TypeScript, 0 error/warning ESLint, dan 100% tes lolos):

```bash
# Menjalankan suite pengujian unit & integrasi (Vitest)
bun run test

# Menjalankan linter ESLint
bun run lint

# Membangun produksi Next.js & verifikasi typecheck
bun run build
```

---

## 📚 Dokumentasi Teknis Terkait

- [Spesifikasi Teknis Engine v2](docs/ENGINE_SPECIFICATION.md): Formula matematika, bobot pengali posisi, aturan capping cohesion, dan algoritma Monte Carlo.
- [Rencana Implementasi Taktis v2](docs/TACTICAL_ENGINE_V2_IMPLEMENTATION_PLAN.md): Rincian tahapan migrasi 7 fase arsitektur.
- [Wiki Taktik Guide to Football](docs/GUIDETOFOOTBALL_TACTICS_WIKI.md): Referensi teori taktik sepak bola modern dan FM24.
