# Rebuild Bertahap FM24 Tactical Engine v2

## Ringkasan

Bangun engine v2 yang benar-benar memodelkan taktik FM24 berdasarkan empat keadaan: base formation, in possession, out of possession, dan transition/rest defence. Migrasikan validator, recommender, Sandbox, persistence, serta UI secara bertahap tanpa memutus aplikasi yang sedang berjalan.

Acuan kebenaran:

1. Perilaku dan batasan role/duty FM24.
2. Prinsip tiga fase dan trade-off dari [Guide to Football](https://guidetofootball.com/tactics/).
3. Karakteristik preset FM dari [Passion4FM](https://www.passion4fm.com/guide-to-football-manager-tactical-styles-preset-tactics/).
4. `ENGINE_SPECIFICATION.md` diperlakukan sebagai dokumentasi yang boleh dikoreksi, bukan sumber yang mengalahkan FM24.

Urutan delivery wajib: fondasi dan test -> domain engine v2 -> analyzer -> recommender -> Sandbox Monte Carlo -> UX dan hardening.

## Perubahan Arsitektur dan Interface

### 1. Domain model v2

Tambahkan schema version `2` dan pisahkan data menjadi:

- `BaseFormation`: posisi resmi yang dipilih pada tactics screen FM24.
- `PhaseShape`: koordinat dan kontribusi pemain saat in-possession, settled defence, attacking transition, defensive transition, dan rest defence.
- `RoleDutyProfile`: definisi perilaku spesifik untuk setiap kombinasi role+duty.
- `TacticAnalysis`: metrics, issues, synergies, trade-offs, confidence, dan empat bentuk permainan.
- `SimulationSnapshot`: salinan immutable taktik, XI, atribut, instructions, engine version, timestamp, dan hash.
- `SimulationResult`: hasil agregat Monte Carlo untuk 24 skenario.
- Tambahkan positional familiarity `Unknown`; data impor tidak boleh otomatis dianggap `Natural`.

Setiap `RoleDutyProfile` minimal memiliki:

- compatible positions;
- allowed duties;
- key/desirable attributes per duty;
- movement: width, depth, lateral movement, roaming, box runs;
- possession behavior: passing risk, progression, carrying, crossing, ball attraction;
- defensive behavior: pressing, screening, marking, recovery, aerial cover;
- transition behavior;
- locked, allowed, dan incompatible player instructions.

Atribut yang hilang tetap `unknown`, bukan diberi nilai `10`. Semua kalkulasi mengembalikan `dataCompleteness` dan `confidence`.

### 2. Normalisasi dan persistence

Buat satu pipeline validasi:

```text
HTML/imported data
-> normalize aliases and values
-> validate player/position/attribute schema
-> report missing fields
-> build immutable squad model
```

Persistence menggunakan key/version baru dan menyimpan:

- squad;
- current tactic;
- selected preset;
- analysis preferences;
- simulation snapshot dan hasil terakhir.

Migrasi v1 harus:

1. Membaca data lama tanpa menghapusnya.
2. Mengonversi positions, roles, duties, instructions, dan saved formation.
3. Menandai atribut/familiarity yang tidak diketahui.
4. Memvalidasi referensi pemain dan role.
5. Menyimpan hasil v2 hanya setelah valid.
6. Fallback ke preset default dengan pesan pemulihan jika konversi gagal.

### 3. Shape dan phase engine

Jangan lagi menyimpulkan satu nama formasi dari campuran posisi dan koordinat. Hasil analyzer harus menampilkan secara terpisah:

- base shape, contoh `4-2-3-1`;
- in-possession shape, contoh `3-2-5`;
- out-of-possession block, contoh `4-4-2`;
- rest defence, contoh `3+2`.

Derivasi shape menggunakan role+duty, mentality, instructions, flank partner, dan phase—not hanya batas koordinat `y`.

Hitung metrics berikut pada skala internal yang terdokumentasi:

- width dan width provider per sisi;
- depth dan runners behind;
- box occupation;
- central/half-space occupation;
- build-up outlets dan passing triangles;
- progression dan press resistance;
- pressing access dan pressing support;
- block compactness;
- defensive line protection;
- rest-defence numbers dan coverage;
- counterattack threat;
- counterpress/regroup readiness;
- aerial attack/defence;
- set-piece threat;
- physical demand dan fatigue risk.

### 4. Role suitability dan XI optimizer

Role suitability menerima `player + position + role + duty`; hasilnya berisi:

- raw attribute fit;
- positional familiarity;
- role-duty fit;
- trait synergy/conflict;
- missing-data penalty;
- final score;
- confidence;
- alasan atribut yang menaikkan/menurunkan skor.

Hapus default atribut `10`.

Ganti assignment greedy dan assignment berdasarkan indeks dengan global constrained assignment:

- Bentuk matriks skor pemain x slot.
- Gunakan Hungarian/min-cost matching untuk XI terbaik tanpa duplikasi.
- Slot yang tidak dapat diisi secara layak harus tetap kosong atau diberi status emergency, bukan diisi diam-diam.
- Pemilihan skuad baru menjalankan optimizer yang sama.
- Drag/drop manual tetap dihormati sebagai locked assignment bila pengguna menguncinya.

### 5. Contextual tactical analyzer

Pisahkan hasil menjadi:

- `fatal constraint`: tidak dapat dimainkan;
- `structural weakness`: fungsi penting hilang;
- `conditional risk`: berbahaya pada kondisi tertentu;
- `trade-off`: keuntungan dengan biaya taktis;
- `synergy`: kombinasi yang saling mendukung;
- `optimization`: saran opsional.

Rule tidak boleh menyatakan kombinasi sebagai konflik absolut jika masih kontekstual. Misalnya high press + regroup, BPD + play out of defence, atau beberapa playmaker harus dinilai berdasarkan struktur pendukung, kualitas pemain, mentality, dan fase permainan.

Setiap temuan harus mempunyai:

- rule ID dan source metadata;
- phase;
- severity;
- confidence;
- affected slots;
- evidence berupa metrics;
- benefit dan downside;
- satu atau lebih solusi;
- expected metric delta;
- preview perubahan sebelum diterapkan.

Ganti Tactical Health menjadi `Tactical Cohesion` dan `Data Confidence`. Nilai cohesion tidak boleh Grade S jika ada fatal issue, danger ber-confidence tinggi, data inti tidak lengkap, atau salah satu phase function kritis kosong.

### 6. Recommender v2

Evaluasi seluruh preset FM24 yang didukung menggunakan pipeline yang sama dengan analyzer.

Untuk setiap preset:

1. Bentuk kandidat role+duty valid per slot.
2. Ambil maksimal tiga kandidat terbaik per slot.
3. Gunakan beam search terbatas untuk kombinasi role+duty.
4. Untuk setiap kandidat, optimalkan XI secara global.
5. Terapkan tactical-style instructions sebagai baseline.
6. Jalankan phase analyzer dan contextual validator.
7. Ranking akhir:
   - 45% XI role-duty fit;
   - 35% tactical cohesion empat fase;
   - 15% matchup-independent risk;
   - 5% data confidence.
8. Tampilkan top 3 beserta alasan, weakness, pemain kunci, dan confidence.

Label fitur menjadi “Rekomendasi Kecocokan Skuad”, bukan “AI”, kecuali kelak benar-benar memakai model AI.

Saat rekomendasi diterapkan, update secara atomik:

- slots;
- `currentFormation`;
- roles dan duties;
- default instructions;
- preset metadata;
- analysis state.

Tampilkan diff dan minta konfirmasi sebelum mengganti taktik aktif.

## Sandbox Monte Carlo dan Matchup Rating

### 1. Snapshot dan stale-state

Sandbox tidak menghitung ulang saat modal dibuka atau editor berubah.

Alur wajib:

1. Pertama dibuka: tampilkan empty state dan tombol `Generate simulation`.
2. Klik generate: buat `SimulationSnapshot` dari taktik dan XI saat itu.
3. Hash snapshot dari normalized tactic, player attributes, engine version, dan simulation config.
4. Hasil tetap terikat pada hash tersebut.
5. Jika taktik, pemain, role, duty, PI, TI, atau squad berubah, pertahankan hasil lama tetapi tampilkan warning `Simulation outdated`.
6. Pengguna harus menekan `Regenerate simulation`.
7. Tampilkan waktu generate, engine version, seed, jumlah pertandingan, dan snapshot summary.

### 2. Lawan dan capacity tiers

Gunakan delapan arketipe yang ada, tetapi lengkapi setiap slot dengan synthetic role attribute profile dan tactical behavior.

Setiap arketipe diuji pada tiga tier:

- below user;
- equal;
- above user.

Capacity pengguna dihitung dari XI aktif:

```text
effective player rating =
70% role-duty key/desirable fit
+ 15% positional familiarity
+ 10% trait compatibility
+ 5% physical sustainability
```

Team capacity `U` adalah rata-rata tertimbang XI. Hitung standard deviation `D` dari effective rating XI dan gunakan:

```text
dynamic gap Delta = clamp(1.5 + 0.35 x D, 1.5, 2.5)
below target = clamp(U - Delta, 1, 20)
equal target = U
above target = clamp(U + Delta, 1, 20)
```

Synthetic opponent attributes digeser secara aditif menuju target tanpa menghilangkan kekuatan/kelemahan arketipenya. Laporkan jika ceiling/floor skala 1–20 memperkecil gap aktual.

Total: `8 formation archetypes x 3 capacity tiers = 24 scenarios`.

### 3. Simulation loop

Jalankan di Web Worker agar UI tidak freeze. Default `2.000 pertandingan per scenario`, total 48.000 pertandingan, dengan progress dan cancel.

Seed berasal dari:

```text
snapshotHash + engineVersion + opponentId + capacityTier
```

Taktik identik harus menghasilkan hasil identik.

Setiap pertandingan:

1. Tentukan expected possession chains dari tempo, mentality, dan control.
2. Untuk setiap chain, simulasikan:
   - regain/restart;
   - transition choice;
   - build-up;
   - press interaction;
   - progression;
   - final-third entry;
   - chance creation;
   - shot quality;
   - goal/save/block;
   - kemungkinan set piece.
3. Kegagalan pada satu tahap memindahkan possession atau memicu transition lawan.
4. Terapkan minute-based fatigue pada pressing, recovery, decisions, dan technical execution.
5. Masukkan substitutions sebagai neutral late-game freshness modifier; jangan mengarang bench player tertentu.
6. Simpan score, xG, shots, possession, territorial entries, turnovers, set pieces, dan phase failures.

Probability output berasal dari frekuensi hasil Monte Carlo, bukan salinan rating.

### 4. Output Sandbox

Untuk setiap scenario tampilkan:

- win/draw/loss distribution;
- average goals dan xG;
- shots dan possession;
- matchup rating `0–100`;
- confidence interval sampling;
- data confidence;
- lima faktor keuntungan terbesar;
- lima risiko terbesar;
- phase tempat matchup dimenangkan/dikalahkan;
- rekomendasi perubahan beserta predicted metric effect.

Matchup rating adalah ringkasan tactical advantage, bukan probabilitas menang. UI harus menjelaskan perbedaannya.

## UX, Reliability, dan Delivery

### 1. Alur produk

Susun ulang pengalaman menjadi:

```text
Build
-> Diagnose
-> Improve
-> Compare
```

- `Build`: formation, player, role, duty, TI, dan PI.
- `Diagnose`: four-phase shape, cohesion, confidence, issues, trade-offs.
- `Improve`: recommendations dengan preview/diff dan undo.
- `Compare`: Sandbox snapshot, tiers, dan hasil Monte Carlo.

Kurangi dominasi satu skor global. Selalu tampilkan cohesion dan confidence berdampingan. Jangan memakai copy seperti “terjamin”, “mutlak”, atau “sempurna” untuk hasil heuristik.

Tambahkan title/metadata aplikasi yang benar, modal semantic, focus trap, keyboard close, accessible labels, responsive layout, dan reduced-motion support.

### 2. Tahap implementasi

1. **Baseline safety**
   - Tambahkan Vitest, React Testing Library, dan Playwright project tests.
   - Tangkap fixture perilaku penting aplikasi lama.
   - Selesaikan seluruh lint error; warning hanya boleh tersisa dengan alasan eksplisit.
2. **Domain v2**
   - Implementasikan types, normalization, role-duty profiles, confidence, hash, dan migrasi persistence.
3. **Analyzer v2**
   - Implementasikan phase shapes, metrics, contextual rules, cohesion, dan source metadata.
   - Pertahankan UI lama melalui adapter sampai analyzer baru lolos acceptance tests.
4. **Optimizer dan recommender**
   - Implementasikan global assignment, beam search, ranking, atomic apply, diff, dan undo.
5. **Sandbox**
   - Implementasikan synthetic opponents, capacity tiers, seeded PRNG, Web Worker, simulation pipeline, persistence, progress, cancel, dan stale-state.
6. **UX migration**
   - Terapkan alur Build–Diagnose–Improve–Compare dan hapus adapter engine lama.
7. **Hardening**
   - Performance profiling, accessibility audit, responsive test, persistence corruption test, dan production build.

Setiap tahap harus menjadi commit/PR terpisah dan tidak boleh menghapus engine lama sebelum parity gate tahap penggantinya lulus.

## Test Plan dan Acceptance Criteria

### Unit tests

- Semua role hanya tersedia pada position/duty FM24 yang valid.
- Duty berbeda menghasilkan kebutuhan atribut dan phase contribution berbeda.
- Missing attributes menurunkan completeness/confidence dan tidak dianggap nilai 10.
- Positional familiarity multiplier benar, termasuk `Unknown`.
- Formation base, in-possession, defensive block, dan rest defence tidak tercampur.
- Contextual rule membedakan conflict, risk, trade-off, dan synergy.
- Tactical cohesion memiliki cap yang benar saat fatal/danger/incomplete.
- Hungarian assignment mengungguli kasus greedy yang sengaja dibuat suboptimal.
- Applying recommendation mengubah seluruh state terkait secara atomik.
- Migrasi v1 valid, data rusak, role tidak dikenal, dan player reference hilang.

### Simulation tests

- 24 scenario selalu dihasilkan.
- Tier capacity memenuhi `below < equal < above`.
- Seed dan snapshot yang sama menghasilkan hasil byte-equivalent.
- Taktik berbeda menghasilkan hash berbeda dan status stale.
- Hasil lama tidak berubah sebelum regenerate.
- Win/draw/loss berjumlah 100% dalam toleransi pembulatan.
- Tim above lebih kuat secara statistik daripada equal dan below pada fixture netral.
- Perubahan yang relevan—misalnya menambah rest defence—memperbaiki metric yang sesuai, bukan semua metric.
- Web Worker progress, cancel, error recovery, dan unsupported-worker fallback.
- Tidak ada klaim “100 rounds” yang berbeda dari jumlah run aktual.

### Integration dan browser tests

- Import HTML lengkap dan parsial.
- Ganti squad tidak menempatkan pemain berdasarkan indeks.
- Buat/edit/save/reload tactic.
- Preview, apply, dan undo recommendation.
- Generate Sandbox, edit tactic, lihat stale warning, lalu regenerate.
- Navigasi keyboard seluruh modal dan controls.
- Desktop, tablet, dan mobile viewport.
- Tidak ada runtime console error.
- `npm run lint`, typecheck, tests, dan production build harus lulus.

### Acceptance akhir

- Tidak ada persentase atau grade tanpa definisi dan confidence.
- Semua rekomendasi dapat ditelusuri ke metrics/rules.
- Sandbox benar-benar memakai atribut pemain, role+duty, TI/PI, opponent profile, capacity tier, fatigue, dan phase interaction.
- Output default tidak lagi memberi Grade S sambil memuat danger ber-confidence tinggi.
- README dan `ENGINE_SPECIFICATION.md` menjelaskan formula, sumber, keterbatasan, schema version, dan cara menambah role/rule/opponent fixture.

## Asumsi yang Dikunci

- Tetap client-side; tidak menambah backend atau database.
- Data lawan adalah sintetis, bukan database klub nyata.
- Simulation v2 adalah phase-based Monte Carlo, bukan spatial/tick-level match engine.
- Default 2.000 pertandingan per scenario dan hasil seeded stabil.
- Bahasa utama UI tetap Indonesia; istilah resmi FM24 dipertahankan dalam bahasa Inggris.
- Set pieces masuk ke simulation metrics, tetapi editor routine set-piece khusus berada di luar pekerjaan ini.
- Data historis pertandingan tidak tersedia, sehingga confidence dibagi menjadi sampling confidence dan data/model confidence; keduanya tidak boleh disamakan dengan validasi empiris.
