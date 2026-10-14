# FM24 Tactical Engine — Remaining Work

## Purpose

Dokumen ini hanya memuat pekerjaan yang belum selesai. Riwayat rencana lengkap disimpan di [archive/TACTICAL_ENGINE_V2_IMPLEMENTATION_PLAN_BACKUP_2026-10-08.md](archive/TACTICAL_ENGINE_V2_IMPLEMENTATION_PLAN_BACKUP_2026-10-08.md). Basis pengetahuan dan batas klaim FM24 berada di [FM24_ROLE_DUTY_AND_PHASE_RESEARCH.md](FM24_ROLE_DUTY_AND_PHASE_RESEARCH.md).

Desain matriks untuk rules interaksi berada di [INTERACTION_RULE_MATRIX_DESIGN.md](INTERACTION_RULE_MATRIX_DESIGN.md).

Desain matriks capacity pemain dan compensation berada di [PLAYER_CAPACITY_MATRIX_DESIGN.md](PLAYER_CAPACITY_MATRIX_DESIGN.md).

Jangan mengimplementasikan angka atau perilaku sebagai fakta Match Engine tanpa evidence ID. Gunakan klasifikasi `official-explicit`, `official-partial`, `observed`, `inferred`, atau `unknown`.

## Priority 1 — Complete the Role–Duty Source of Truth

Engine sudah menyediakan exact profile untuk seluruh 85 kombinasi role–duty yang ditawarkan builder. Namun 59 profile masih berupa inference dari deskripsi role, duty, dan locked PI.

### Work

1. Ambil inventaris role, duty, posisi valid, deskripsi, dan locked player instructions dari instalasi FM24 desktop final patch.
2. Simpan source registry terpisah berisi:
   - evidence ID;
   - versi dan patch FM;
   - sumber atau capture;
   - tanggal verifikasi;
   - klaim yang didukung;
   - evidence class.
3. Ganti field hasil inference hanya ketika evidence mendukung field tersebut.
4. Biarkan perilaku yang tidak disebutkan sebagai `unknown`; jangan mengisi default yang terlihat authoritative.
5. Modelkan position × role × duty secara eksplisit, termasuk mirrored left/right availability.
6. Tambahkan fields yang belum tersedia:
   - zones occupied dan vacated;
   - ball-zone response;
   - neighbour triggers;
   - compensation expected;
   - collision rules dan priority;
   - formation constraints;
   - instruction overrides;
   - role intent versus execution confidence.

### Completion criteria

- Setiap kombinasi UI mempunyai exact profile dan evidence classification.
- Tidak ada fallback ke profile duty lain.
- Setiap non-unknown claim mempunyai minimal satu evidence ID.
- Daftar 59 inferred profiles turun hanya melalui evidence atau tetap terlihat jelas sebagai inference.
- Coverage test membandingkan seluruh kombinasi `ALL_ROLES.availableDuties` dengan catalogue.

## Priority 2 — Make the Phase Engine Contextual

Engine sudah mempunyai proyeksi enam fase open play: build-up, progression, final third, attacking transition, defensive transition, dan settled defence. Implementasi tersebut masih memakai zonal projection dan belum menyelesaikan contextual rotations FM24.

### Work

1. Ganti interpolasi koordinat generik dengan resolver berbasis behaviour intent.
2. Tambahkan konteks resolusi:
   - possession owner;
   - ball third dan channel;
   - role tetangga;
   - line membership;
   - team instructions;
   - mentality;
   - stable versus unsettled shape.
3. Implementasikan rule resmi yang sudah terdokumentasi:
   - Advanced Playmaker bergeser untuk membuka jalur Segundo Volante;
   - defensive BWM memberi central cover pada rotasi tersebut;
   - IW/IF dapat mempertahankan width ketika gelandang mengisi same-side half-space;
   - Half-Back pada double pivot dapat mengisi slot centre-back kiri atau kanan;
   - Inverted Full-Back menjadi central defender saat possession;
   - deeper DM mengompensasi pergerakan IWB;
   - centre-back melakukan split/cover ketika Libero maju;
   - IWB mendapat spatial priority saat berbenturan dengan same-side Libero.
4. Pecah settled defence menjadi low block, mid block, dan high press.
5. Pecah final third menjadi established attack dan final action.
6. Tambahkan state set piece sebagai model terpisah; jangan memakai asumsi open-play untuk restart.
7. Hitung shape dari line membership dan occupied zones, bukan threshold koordinat saja.
8. Keluarkan explanation chain untuk setiap rotasi:

```text
trigger -> movement/compensation -> occupied/vacated zone -> benefit -> risk -> evidence -> confidence
```

### Completion criteria

- Seluruh rule kontekstual resmi di atas memiliki regression fixture.
- Konflik Libero–IWB menghasilkan priority resolution dan penjelasan yang benar.
- Output membedakan intended shape, structural consequence, dan execution confidence.
- Unknown timing, frequency, dan numeric thresholds tidak dipresentasikan sebagai konstanta FM24.
- Phase result bersifat deterministik untuk input yang sama.

## Priority 3 — Connect the New Model to the Product

`deriveTacticalPhaseModel()` saat ini tersedia melalui engine export dan test, tetapi belum menjadi source of truth tampilan aplikasi.

### Work

1. Ganti konsumsi four-phase legacy di analyzer/UI dengan tactical phase model baru melalui adapter yang kecil.
2. Tampilkan phase selector dan shape tiap fase pada pitch.
3. Tampilkan per pemain:
   - intended function;
   - movement reason;
   - evidence class;
   - confidence;
   - compensation atau collision yang aktif.
4. Buat warning selalu menjawab apa yang salah, fase terjadinya, penyebab, dampak, dan opsi perbaikan.
5. Pertahankan satu terminology map Indonesia–FM English agar label konsisten.

### Completion criteria

- Pengguna dapat membandingkan seluruh fase tanpa membuka developer data.
- Tidak ada danger icon tanpa explanation.
- Perubahan role, duty, mentality, atau instruction memperbarui fase dan reasoning terkait.
- UI membedakan official behaviour, observed behaviour, dan tactical inference.

## Priority 4 — Evidence Acquisition and Calibration

### Work

1. Buat fixture observasi terkontrol untuk behaviour yang tidak dijelaskan SI.
2. Rekam patch, formation, role-duty, TI/PI, profil pemain, setup lawan, sample size, dan uncertainty.
3. Prioritaskan eksperimen satu variabel:
   - duty difference;
   - mentality;
   - team/player instruction precedence;
   - ball-zone response;
   - transition recovery;
   - pressing and marking handoff.
4. Simpan hasil observasi terpisah dari official evidence.
5. Gunakan data komunitas hanya sebagai hypothesis/calibration input, bukan fakta resmi.

### Completion criteria

- Setiap observed rule dapat direproduksi dari fixture.
- Setiap eksperimen mencatat kontrol, sample size, dan uncertainty.
- Patch-specific evidence tidak bocor menjadi universal rule.

## Priority 5 — Verification and Reliability

### Work

1. Perbaiki environment test `jsdom/undici` agar Vitest dapat menjalankan suite, bukan hanya typecheck.
2. Self-host Geist atau sediakan build-safe local font agar production build tidak bergantung pada Google Fonts.
3. Tambahkan browser tests untuk phase selector, contextual explanation, role changes, mentality changes, dan responsive pitch.
4. Audit persistence jika schema role evidence atau phase output disimpan.
5. Profile performa resolver pada setiap perubahan builder.

### Completion criteria

- `npm run lint`, typecheck, unit tests, integration tests, dan production build lulus.
- Tidak ada runtime console error.
- Tidak ada network dependency saat production build.
- Migrasi data lama tetap aman dan hasil lama tidak diberi evidence classification yang keliru.

## Delivery Order

1. Source registry dan schema role behaviour.
2. Official contextual rotation rules.
3. Phase resolver dan line-membership model.
4. Analyzer/UI integration.
5. Controlled observations.
6. Test/build hardening.

Selesaikan satu tahap hanya ketika completion criteria tahap tersebut terbukti melalui test atau artefak evidence.
