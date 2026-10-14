# Player Functional Capacity Matrix

**Status:** proposed design before runtime implementation  
**Scope:** player capability, functional demand, capacity gaps, and compensation rules  
**Data currently available:** FM attributes 1–20, positional familiarity, player traits

## Core distinction

- **Player capacity**: kemampuan yang diperkirakan dari atribut, familiarity, traits, kondisi data, dan kebutuhan fungsi.
- **Observed performance**: hasil tindakan yang benar-benar terjadi dalam pertandingan, misalnya crossing attempted/completed, progressive carries, chances created, atau recovery success.

Aplikasi belum menyimpan observed match data. Semua hasil tahap ini harus berlabel **capacity**, bukan performance.

## Decision

Gunakan matriks:

```text
player × tactical function × phase = functional capacity
```

Jangan menggunakan satu nilai `player × role`. Role adalah kumpulan tuntutan fungsi. Pemain dapat bagus pada sebagian fungsi role dan lemah pada fungsi lainnya.

```text
Role-duty + team structure
          ↓
 functional demands per phase
          ↓
 player functional capacities
          ↓
 demand–capacity gaps
          ↓
 compensation, responsibility transfer, or role change
```

## Functional capacity record

```ts
interface PlayerFunctionalCapacity {
  playerId: string;
  functionId: TacticalFunctionId;
  phases: TacticalPhaseId[];
  capacity: number;       // 0–100 capability estimate
  confidence: number;     // 0–100 evidence/data completeness
  availability: number;   // familiarity/position availability, separate from skill
  components: CapacityComponentScore[];
  strengths: CapacityEvidence[];
  limitations: CapacityEvidence[];
  traitEffects: TraitEffect[];
  missingInputs: string[];
}
```

Capacity, confidence, dan availability harus ditampilkan terpisah. Nilai `70` dengan confidence `40` tidak boleh diperlakukan sama dengan `70` dengan confidence `100`.

## Function catalogue

### In possession

| Function | Meaning |
|---|---|
| `first_line_outlet` | Menjadi opsi aman untuk menerima bola pada build-up awal |
| `press_escape_receiver` | Menerima dan mengamankan bola di bawah tekanan |
| `ball_progression_pass` | Memajukan bola melalui operan |
| `ball_progression_carry` | Memajukan bola melalui dribble/carry |
| `width_provider` | Menjaga lebar dan membuat jalur umpan sisi luar |
| `overlap_arrival` | Tiba di luar pemain depan dengan timing dan kecepatan yang cukup |
| `underlap_arrival` | Menyerang channel dalam/half-space dari belakang bola |
| `cross_delivery` | Mengirim crossing dengan pilihan, teknik, dan akurasi memadai |
| `cutback_delivery` | Mencapai byline dan memilih umpan tarik yang tepat |
| `half_space_combination` | Melakukan kombinasi pendek di half-space |
| `box_arrival` | Masuk ke kotak pada timing yang tepat |
| `box_finishing` | Menyelesaikan peluang di kotak |
| `aerial_target` | Menjadi target bola udara |
| `possession_security` | Menjaga sirkulasi dan membatasi turnover |

### Out of possession and transitions

| Function | Meaning |
|---|---|
| `press_access` | Mencapai pemegang bola untuk melakukan tekanan |
| `press_sustainability` | Mengulang aksi pressing sepanjang pertandingan |
| `screening` | Menutup jalur umpan dan ruang di depan lini belakang |
| `wide_duel_defence` | Menahan winger/full-back lawan di sisi lapangan |
| `central_duel_defence` | Mengatasi duel dan penetrasi sentral |
| `recovery_run` | Kembali melindungi ruang setelah possession hilang |
| `transition_delay` | Memperlambat counter agar struktur sempat pulih |
| `rest_defence_cover` | Menjaga ruang dan lawan ketika tim menyerang |
| `aerial_defence` | Mengamankan duel udara dan second ball |
| `counter_outlet` | Menjadi outlet segera setelah regain |

Function catalogue dapat bertambah, tetapi setiap function harus mempunyai definisi, phase, attribute model, dan test fixture.

## Capacity components

Setiap function dihitung dari komponen berikut jika relevan:

1. **Execution** — kemampuan teknis melakukan tindakan.
2. **Perception and decision** — membaca situasi, memilih tindakan, dan timing.
3. **Access** — kemampuan fisik mencapai lokasi atau duel.
4. **Repeatability** — kemampuan mengulang tugas tanpa penurunan besar.
5. **Security** — kecenderungan mempertahankan kontrol dan membatasi risiko.

Tidak semua function memakai kelima komponen. `cross_delivery` sangat bergantung pada execution dan decision; `recovery_run` lebih bergantung pada access, perception, dan repeatability.

## Scoring model

Normalisasi atribut diketahui:

```text
normalized(attribute) = (attribute - 1) / 19 × 100
```

Hitung setiap komponen sebagai weighted mean dari atribut yang mempunyai evidence. Kemudian gunakan weighted geometric mean untuk capacity akhir:

```text
componentScore = Σ(normalized attribute × weight) / Σ(weight)

capacity = geometricMean(required component scores)
```

Geometric mean dipilih agar satu bottleneck penting tidak tertutup oleh atribut lain yang sangat tinggi. Contoh: Pace tinggi tidak boleh membuat pemain dinilai sebagai crosser bagus ketika Crossing dan Decisions rendah.

### Missing data

- Atribut hilang tidak diberi nilai `10`.
- Capacity dihitung dari data yang diketahui, lalu confidence diturunkan berdasarkan coverage dan importance atribut yang hilang.
- Jika satu required component tidak mempunyai data cukup, hasil menjadi `unknown`, bukan `0` dan bukan average squad.

### Traits

Traits tidak menambah kemampuan teknis dasar. Traits memodifikasi kecenderungan atau compatibility:

- trait yang searah fungsi dapat menaikkan likelihood/intent fit;
- trait yang berlawanan dapat menurunkan intent fit;
- trait tidak boleh mengubah Crossing `8` menjadi kapasitas crossing tinggi.

### Familiarity

Positional familiarity disimpan sebagai `availability/execution reliability`, bukan dikalikan langsung ke seluruh atribut. Pemain yang unfamiliar mungkin tetap memiliki teknik crossing bagus, tetapi reliability posisi, timing, dan decisions dalam struktur lebih rendah.

## Starter attribute matrices

Bobot berikut adalah **model hypothesis**, bukan bobot rahasia Match Engine. Semuanya harus versioned dan dapat dikalibrasi.

### `overlap_arrival`

| Component | Attributes | Weight within component |
|---|---|---|
| Access | acceleration, pace | 55%, 45% |
| Perception/decision | offTheBall, anticipation, decisions | 45%, 20%, 35% |
| Repeatability | stamina, workRate | 55%, 45% |

Final component weights: Access 35%, Perception/decision 40%, Repeatability 25%.

### `cross_delivery`

| Component | Attributes | Weight within component |
|---|---|---|
| Execution | crossing, technique, firstTouch | 60%, 25%, 15% |
| Perception/decision | decisions, vision, anticipation | 50%, 30%, 20% |
| Security | composure, balance | 60%, 40% |

Final component weights: Execution 55%, Perception/decision 35%, Security 10%.

### `cutback_delivery`

| Component | Attributes | Weight within component |
|---|---|---|
| Execution | passing, crossing, technique, firstTouch | 35%, 30%, 20%, 15% |
| Perception/decision | decisions, vision, teamwork | 45%, 30%, 25% |
| Access | acceleration, dribbling, agility | 35%, 40%, 25% |

Final component weights: Execution 40%, Perception/decision 35%, Access 25%.

### `recovery_run`

| Component | Attributes | Weight within component |
|---|---|---|
| Access | acceleration, pace, agility | 45%, 40%, 15% |
| Perception/decision | anticipation, positioning, decisions | 35%, 40%, 25% |
| Repeatability | stamina, workRate, naturalFitness | 45%, 40%, 15% |

Final component weights: Access 40%, Perception/decision 35%, Repeatability 25%.

### `rest_defence_cover`

| Component | Attributes | Weight within component |
|---|---|---|
| Perception/decision | positioning, anticipation, decisions, concentration | 35%, 25%, 20%, 20% |
| Duel execution | tackling, marking, strength | 40%, 35%, 25% |
| Access | acceleration, pace | 55%, 45% |

Final component weights: Perception/decision 45%, Duel execution 35%, Access 20%.

## Demand matrix

Role-duty tidak langsung menghasilkan verdict. Role-duty dan struktur menghasilkan function demand:

```ts
interface FunctionalDemand {
  functionId: TacticalFunctionId;
  phase: TacticalPhaseId;
  side?: 'left' | 'centre' | 'right';
  importance: 'critical' | 'primary' | 'supporting' | 'optional';
  minimumCapacityBand: 'basic' | 'competent' | 'strong' | 'elite';
  responsibleSlots: string[];
  redundancyRequired: number;
  reason: string;
  sourceIds: string[];
}
```

Capacity band sebaiknya dipakai untuk explanation, bukan mengklaim threshold FM24. Nilai awal internal yang dapat dikalibrasi:

| Band | Internal range |
|---|---:|
| basic | 40–54 |
| competent | 55–69 |
| strong | 70–84 |
| elite | 85–100 |

## Gap resolution

```text
function gap = required band − best available capacity
```

Setiap gap harus diselesaikan melalui salah satu mekanisme berikut:

1. **Direct fulfilment** — pemain utama memenuhi demand.
2. **Shared responsibility** — dua pemain membagi function yang memang dapat dibagi.
3. **Responsibility transfer** — pemain lain mengambil function melalui perubahan role/instruction.
4. **Demand reduction** — tactical objective atau instruction diubah sehingga function tidak lagi primary.
5. **Accepted risk** — pengguna mempertahankan struktur dan aplikasi menjelaskan konsekuensinya.

Pemain pendamping hanya valid jika fungsi pendamping benar-benar menutup gap. Gelandang yang memberi defensive cover tidak otomatis memperbaiki kualitas crossing full-back.

## Worked example: right Attacking Full-Back + Inside Forward

### Structural demand

Jika Inside Forward kanan masuk ke half-space dan Attacking Full-Back menjadi satu-satunya width provider, sisi kanan menghasilkan demand:

| Function | Importance | Primary owner |
|---|---|---|
| width provider | critical | right full-back |
| overlap arrival | primary | right full-back |
| cross/cutback delivery | primary | right full-back |
| half-space threat | primary | inside forward |
| defensive transition cover | critical | full-back + nearby midfielder/rest defence |
| recovery run | primary | right full-back |

### Case A — weak crossing, adequate overlap

Full-back dapat mencapai zona tinggi tetapi `cross_delivery` berada di bawah demand.

Valid responses:

- pindahkan delivery responsibility kepada winger atau wide midfielder yang tetap lebar;
- ubah serangan menjadi underlap/cutback jika `cutback_delivery` lebih kuat;
- kurangi crossing dan gunakan recycle/combination;
- fokuskan chance creation ke sisi lain;
- ubah full-back duty jika kontribusi tingginya tidak menghasilkan end product.

Invalid response:

- menambahkan midfielder defensif lalu menyatakan masalah crossing selesai. Midfielder tersebut hanya dapat menutup transition exposure.

### Case B — strong crossing, weak recovery

Full-back mampu memenuhi attacking demand tetapi meninggalkan transition gap.

Valid compensation:

- same-side midfielder dengan `rest_defence_cover` kuat menutup channel yang ditinggalkan;
- defensive midfielder bergeser ke sisi tersebut;
- right centre-back mempunyai recovery/access capacity memadai;
- opposite full-back/IFB tetap membentuk rest-defence line;
- turunkan duty atau demand overlap jika tidak ada cover.

### Case C — weak overlap and weak delivery

Menambah cover tidak menyelesaikan attacking function. Sistem perlu melakukan responsibility transfer atau role change:

- Inside Forward menjadi Winger/Inverted Winger yang dapat menyediakan width;
- full-back menjadi Support/Defend;
- gunakan playmaker/overlap dari sisi lain;
- terima sisi kanan sebagai circulation side, bukan creation side.

## Compensation rule schema

```ts
interface CapacityGapRule {
  id: string;
  demand: {
    functionId: TacticalFunctionId;
    phase: TacticalPhaseId;
    side?: PitchSide;
    importanceAtLeast: FunctionalImportance;
  };
  when: CapacityPredicate[];
  validCompensators: CompensationOption[];
  invalidAssumptions?: string[];
  output: {
    severity: 'limitation' | 'conditional_risk' | 'structural_weakness';
    explanationTemplate: string;
  };
}
```

Compensation harus menyebut function yang diganti atau dilindungi. Hindari teks generik seperti “tambahkan support”.

## Proposed output for one player

```text
Rico — WB (Attack), right side

Overlap arrival       76  strong      confidence 92
Width provision       72  strong      confidence 88
Cross delivery        48  basic       confidence 95
Cutback delivery      63  competent   confidence 90
Recovery run          57  competent   confidence 84
Rest-defence cover    42  basic       confidence 91

Verdict:
Mampu tiba di area tinggi, tetapi crossing adalah bottleneck. Gunakan cutback/recycle
atau pindahkan tanggung jawab final delivery. Same-side midfielder dapat menutup
transisi, tetapi tidak memperbaiki delivery.
```

## Implementation sequence

1. Tambahkan canonical function IDs dan capacity component schema.
2. Implementasikan normalisasi atribut tanpa fallback `10`.
3. Implementasikan lima starter function calculators.
4. Buat demand generator untuk WB/FB Attack + IF/IW/W pada satu sisi.
5. Implementasikan gap resolver yang membedakan attacking delivery dan defensive cover.
6. Tampilkan component breakdown, missing inputs, dan confidence.
7. Tambahkan fixture untuk Case A, B, dan C.
8. Baru perluas function catalogue ke midfield, central defence, dan striker.

## Acceptance criteria

- Capacity dan observed performance tidak tertukar dalam UI atau code.
- Tidak ada atribut hilang yang berubah menjadi nilai `10`.
- Pemain tidak menerima satu universal role score tanpa function breakdown.
- Weak crossing dan weak recovery menghasilkan solusi berbeda.
- Compensation hanya dianggap valid jika menyediakan function yang hilang atau melindungi consequence yang spesifik.
- Setiap verdict menampilkan demand, capacity, gap, evidence attributes, missing data, dan confidence.
- Formula dan weights mempunyai version identifier dan dinyatakan sebagai model hypothesis.

## Evidence boundary

Definisi atribut dapat bersumber dari [manual resmi FM24](https://community.sports-interactive.com/sigames-manual/football-manager-2024-fr/joueurs-r5004/). Kombinasi bobot dan capacity bands di dokumen ini adalah model produk yang harus dikalibrasi; keduanya bukan formula Match Engine yang dipublikasikan Sports Interactive.
