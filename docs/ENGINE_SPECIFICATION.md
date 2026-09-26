# Spesifikasi Teknis Tactical Match Engine v2

Dokumen ini menyajikan arsitektur lengkap, formulasi matematika, struktur data, dan panduan teknis implementasi untuk **Tactical Match Engine v2** pada Football Manager 2024 (FM24) Team Analyzer.

---

## 1. Arsitektur & Prinsip Desain

### 1.1 Pure Client-Side Execution
- Tidak ada ketergantungan pada backend server, cloud API, atau database eksternal.
- Komputasi intensif (simulasi Monte Carlo 24 skenario $\times$ 2.000 laga = 48.000 pertandingan) didelegasikan ke **HTML5 Web Worker** dengan fallback synchronous otomatis jika Web Worker tidak didukung (misalnya saat server-side rendering atau test runner Vitest).

### 1.2 Schema Versioning
- Format data taktik saat ini menggunakan `schemaVersion: 2`.
- Migrasi non-destruktif dari `schemaVersion: 1` (`fm24_saved_tactic_v1`) dilakukan otomatis saat startup melalui modul `src/engine/v2/persistence.ts`. Jika payload mengalami kerusakan struktural, engine melakukan fallback ke default state yang valid tanpa menyebabkan crash aplikasi.

---

## 2. Model Domain & Normalisasi Atribut

### 2.1 Model Atribut Pemain (PlayerV2)
Berbeda dengan v1 yang mengasumsikan atribut kosong sebagai nilai rata-rata 10, v2 memperlakukan atribut yang tidak diisi sebagai `undefined`:
```typescript
export interface PlayerV2 {
  id: string;
  name: string;
  age: number;
  club: string;
  nationality: string;
  positions: PlayerPositionV2[];
  attributes: Record<string, number | undefined>;
  traits?: string[];
}
```

### 2.2 Multiplier Posisi (PositionalFamiliarityV2)
Bobot pengali kesesuaian posisi pemain terhadap peran:
| Posisi Familiarity | Pengali (Multiplier) | Deskripsi |
| :--- | :--- | :--- |
| `Natural` | $1.00$ | Posisi alami pemain |
| `Accomplished` | $0.90$ | Posisi sekunder yang sangat dikuasai |
| `Competent` | $0.70$ | Mampu bermain secara kompeten |
| `Unconvincing` | $0.50$ | Posisi canggung dengan penurunan efektivitas |
| `Awkward` | $0.30$ | Jarang bermain di posisi ini |
| `Unknown` | $0.15$ | Posisi asing / data posisi tidak tercatat |

### 2.3 Kelengkapan Data & Confidence
Data confidence dihitung berdasarkan rasio atribut esensial peran yang terisi dalam skuad starter:
$$\text{DataConfidence} = \frac{\sum_{i=1}^{11} \text{KnownKeyAttributes}_i}{\sum_{i=1}^{11} \text{ExpectedKeyAttributes}_i} \times 100\%$$
Data confidence selalu disajikan berdampingan dengan Tactical Cohesion agar pengguna memahami validitas diagnostik.

---

## 3. Dynamic 4-Phase Tactical Shapes

Engine memodelkan posisi spasial 11 pemain dalam 4 fase dinamis di atas lapangan koordinat $100 \times 100$ ($x \in [0, 100]$, $y \in [0, 100]$ di mana $y=0$ adalah gawang lawan dan $y=100$ adalah gawang sendiri):

1. **Base Shape**: Formasi dasar saat kick-off (contoh: 4-3-3, 4-2-3-1, 3-4-3).
2. **In-Possession Shape**: Struktur saat membangun serangan dan fase penguasaan bola (contoh: IFB masuk membentuk 3 bek, IWB masuk sebagai double pivot, Winger melebar atau menusuk ke half-space).
3. **Settled Defence Shape**: Blok pertahanan saat lawan menguasai bola di area tengah (berdasarkan Line of Engagement: High Press, Mid-Block, atau Low Block).
4. **Rest Defence Shape**: Alokasi pemain siaga di belakang garis bola saat tim menyerang (contoh: struktur $3+2$, $2+3$, atau $3+1$) untuk memitigasi counter-attack kilat lawan.

---

## 4. 16 Metrik Taktis Terkontekstualisasi (Skala 0–100)

Setiap metrik merefleksikan aspek spesifik dari interaksi formasi, role, duty, dan team instructions, kemudian dimodulasi oleh atribut rata-rata pemain di pos terkait:

1. `widthLeft`: Penyedia lebar sayap kiri (WB, W, FB).
2. `widthRight`: Penyedia lebar sayap kanan (WB, W, FB).
3. `depthAndRunners`: Pelari menusuk di belakang garis lawan (AF, IF-At, SS, MEZ-At).
4. `boxOccupation`: Kepadatan pemain yang tiba di kotak penalti saat serangan final.
5. `centralHalfSpaceOccupation`: Keseimbangan pengisian koridor tengah dan half-space.
6. `buildUpOutletsAndTriangles`: Ketersediaan opsi umpan pendek dari lini belakang (BPD, DLP, SK).
7. `progressionAndPressResistance`: Ketahanan pemain lini tengah terhadap pressing lawan (Composure, Decisions, Balance).
8. `pressingAccessAndSupport`: Intensitas dan sudut penekanan lini depan (Work Rate, Aggression).
9. `blockCompactness`: Kerapatan jarak vertikal antara Line of Engagement dan Defensive Line.
10. `defensiveLineProtection`: Kehadiran gelandang bertahan perusak serangan di depan bek (Anchor, BWM, DM-De).
11. `restDefenceCoverage`: Jumlah dan stabilitas pemain di belakang bola saat transisi negatif.
12. `counterattackThreat`: Kecepatan transisi menyerang ke ruang terbuka lawan (Pace, Acceleration, Off The Ball).
13. `counterpressRegroupReadiness`: Kesiapan tim melakukan counter-press langsung atau regroup cepat.
14. `aerialAttackDefence`: Kekuatan duel udara dalam bola mati dan umpan silang (Jumping Reach, Heading, Strength).
15. `setPieceThreat`: Ancaman bola mati berdasarkan instruksi dan pengambil bola mati.
16. `physicalDemandFatigueRisk`: Tingkat pengurasan energi fisik berdasarkan intensitas pressing dan tempo tim.

---

## 5. Mesin Aturan Kontekstual & Capping Cohesion

### 5.1 6 Kategori Temuan Taktis
Setiap temuan taktis diklasifikasikan ke dalam 6 tingkat keparahan:
1. `fatal_constraint`: Pelanggaran regulasi mendasar (contoh: tidak ada kiper, 0 bek).
2. `structural_weakness`: Kelemahan struktural serius (contoh: tidak ada rest defence, double playmaker di koridor yang sama).
3. `conditional_risk`: Risiko yang bergantung pada situasi pertandingan atau lawan (contoh: high press tanpa kiper sapu/Sweeper Keeper).
4. `trade_off`: Pilihan taktis sadar yang memiliki kelebihan dan kekurangan berimbang (contoh: tempo sangat tinggi yang meningkatkan peluang sekaligus risiko turnover).
5. `synergy`: Kombinasi FM24 yang saling melengkapi (contoh: IF-At berpasangan dengan WB-Su di satu sisi).
6. `optimization`: Saran perbaikan kecil untuk efisiensi taktis.

### 5.2 Aturan Capping Tactical Cohesion
Skor Cohesion dasar ($0–100$) dihitung dari rata-rata metrik dan sinergi, namun **wajib tunduk pada batasan (capping) ketat**:
- Jika terdapat `fatal_constraint`: $\text{Cohesion} \le 35$ (Grade **F** mutlak).
- Jika terdapat `structural_weakness` berkategori kritis: $\text{Cohesion} \le 55$ (Maksimal Grade **D**).
- Jika data confidence $< 40\%$: $\text{Cohesion} \le 70$ (Maksimal Grade **C**).

Tabel konversi Grade:
- $S \ge 90$
- $A \in [80, 89]$
- $B \in [68, 79]$
- $C \in [50, 67]$
- $D \in [36, 49]$
- $F \le 35$

---

## 6. Algoritma Optimasi Penugasan Hungarian (Kuhn-Munkres)

Untuk menghindari *greedy trap* (di mana pemain serbabisa merebut slot yang bisa diisi pemain lain sehingga slot kedua kekurangan personel), engine menggunakan algoritma **Kuhn-Munkres** $O(M \cdot N^2)$ untuk bipartite matching berbobot:

### 6.1 Matriks Biaya (Cost Matrix)
Didefinisikan untuk $M$ slot dan $N$ pemain calon ($N \ge M$):
$$\text{Cost}_{i, j} = 1000 - \text{SuitabilityScore}(P_j, S_i)$$
Algoritma mencari permutasi penugasan yang meminimalkan total biaya (yang secara ekuivalen memaksimalkan kecocokan total tim).

### 6.2 Dukungan Slot Terkunci (Locked Slots)
Jika pengguna mengunci posisi pemain tertentu, slot tersebut diproses lebih dahulu dan dikeluarkan dari graf bipartit terbuka.

---

## 7. Rekomendasi Kecocokan Skuad (Squad Recommender v2)

Modul **"Rekomendasi Kecocokan Skuad"** mengevaluasi seluruh preset blueprint taktik yang didukung menggunakan kombinasi Beam Search:

### 7.1 Formula Skor Komposit
$$\text{CompositeScore} = 0.45 \cdot \text{RoleFit} + 0.35 \cdot \text{TacticalCohesion} + 0.15 \cdot (100 - \text{RiskPenalty}) + 0.05 \cdot \text{DataConfidence}$$

### 7.2 Atomic Apply & Undo
Penerapan rekomendasi bersifat atomik:
- Seluruh 11 slot, instruksi tim, dan formasi template diperbarui secara bersamaan.
- Snapshot status sebelumnya disimpan ke dalam objek `previousStateSnapshot`.
- Pengguna dapat melakukan **Undo Taktik** seketika untuk mengembalikan seluruh state sebelum rekomendasi diterapkan.

---

## 8. Sandbox Monte Carlo Match Engine (24 Skenario)

### 8.1 Matriks Skenario $8 \times 3 = 24$
Menghadapi 8 arketipe lawan terstandarisasi FM24:
1. `gegenpress_elite`: Gegenpress 4-2-3-1 DM Wide agresif.
2. `tiki_taka_possession`: Tiki-Taka 4-3-3 DM penguasaan bola tinggi.
3. `catenaccio_low_block`: Catenaccio 5-3-2 Low Block defensif rapat.
4. `direct_counter_route_one`: Direct Counter 4-4-2 serangan balik vertikal kilat.
5. `wing_play_cross_heavy`: Wing Play 4-4-2 umpan silang udara tiada henti.
6. `fluid_counter_attack`: Fluid Counter Attack 3-4-1-2 dinamis.
7. `mid_block_pragmatic`: Pragmatic Mid-Block 4-2-3-1 terorganisir.
8. `vertical_tiki_taka`: Vertical Tiki-Taka 4-3-3 penetrasi cepat antar lini.

Setiap arketipe diuji pada 3 dynamic capacity tier:
- `below`: Lawan berkapasitas di bawah tim pengguna ($U - 1.5D$).
- `equal`: Lawan berkekuatan seimbang ($U$).
- `above`: Lawan berkapasitas di atas tim pengguna ($U + 1.5D$).

### 8.2 PRNG Deterministik Mulberry32
Untuk memastikan bahwa simulasi dengan seed yang sama menghasilkan angka acak yang identik secara deterministik:
```typescript
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 8.3 Rantai Simulasi Penguasaan Bola (Possession Chains)
Setiap laga disimulasikan melalui rangkaian chain fase:
1. `build_up`: Keberhasilan keluar dari pressing lawan.
2. `midfield_press`: Duel perebutan lini tengah dan sirkulasi bola.
3. `final_third`: Penetrasi sepertiga akhir lawan dan pembuatan peluang (xG).
4. `transition`: Efisiensi transisi serangan balik atau regroup bertahan.
5. `fatigue_modifier`: Pada menit 70+, tim dengan beban fisik tinggi (`physicalDemandFatigueRisk >= 75`) mengalami penurunan efektivitas pressing dan akurasi penyelesaian peluang.

### 8.4 Interval Konfidensi Wilson (Wilson Score Interval)
Interval konfidensi probabilitas kemenangan ($95\%$ confidence level, $z = 1.96$):
$$\hat{p} = \frac{w}{n}$$
$$\text{CI} = \frac{\hat{p} + \frac{z^2}{2n} \pm z\sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$

### 8.5 Matchup Rating vs Probabilitas Menang
- **Matchup Rating (0–100)**: Indeks keunggulan taktis tim relatif terhadap arketipe lawan berdasarkan metrik benturan spasial (misal: rest defence vs counter-attack threat).
- **Win Rate (%)**: Frekuensi empiris hasil kemenangan dari simulasi Monte Carlo 2.000 laga.

### 8.6 Deteksi Snapshot Kedaluwarsa (Stale Snapshot)
Setiap perubahan pada formasi, pemain di slot, peran, tugas, atau instruksi tim menghasilkan hash SHA-256/FNV-1a baru. Jika hash taktik aktif berbeda dengan hash taktik saat simulasi dijalankan, UI Sandbox otomatis menampilkan banner peringatan **"Taktik Telah Berubah — Hasil Simulasi Usang (Stale)"** dan tombol untuk menjalankan simulasi ulang.

---

## 9. Panduan Ekstensi Pengembang

### 9.1 Menambahkan Profil Role/Duty Baru
1. Buka `src/engine/v2/roleDutyProfiles.ts`.
2. Tambahkan definisi baru ke dalam record `ROLE_DUTY_PROFILES` sesuai posisi FM24 yang valid, lengkap dengan `keyAttributes`, `inPossessionCoords`, dan `settledDefenceCoords`.
3. Jalankan `bun run test src/test/domainV2.test.ts` untuk memverifikasi validitas schema.

### 9.2 Menambahkan Aturan Diagnostik Taktis Baru
1. Buka `src/engine/v2/analyzer.ts`.
2. Masukkan evaluator logika baru ke dalam fungsi `analyzeTacticV2` pada seksi tingkat keparahan yang relevan (`fatalErrors`, `structural_weakness`, `conditional_risk`, `synergy`, dll.).
3. Sertakan metadata sumber (`FM24_RULE`, `GUIDE_TO_FOOTBALL`, atau `PASSION_4_FM`).
4. Jalankan `bun run test src/test/analyzerV2.test.ts`.

### 9.3 Menambahkan Arketipe Lawan Baru
1. Buka `src/engine/sandbox.ts` dan `src/engine/v2/monteCarlo.ts`.
2. Tambahkan objek arketipe baru dengan 11 slot terisi, instruksi tim yang merefleksikan identitas taktis tersebut, dan key threats lawan.
3. Jalankan `bun run test src/test/simulationV2.test.ts`.
