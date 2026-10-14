# FM24 Interaction Rule Matrix

**Status:** proposed source-of-truth design  
**Scope:** poin 3 — interaksi role, duty, mentality, instruction, dan struktur  
**Depends on:** [FM24_ROLE_DUTY_AND_PHASE_RESEARCH.md](FM24_ROLE_DUTY_AND_PHASE_RESEARCH.md)

## Decision

Gunakan **sparse interaction rule table**, bukan satu matriks skor role × role.

Sebuah interaksi hanya disimpan ketika ada hubungan taktis yang dapat dijelaskan. Fase, sisi, relasi posisi, instruksi, dan keadaan struktur diperlakukan sebagai predicate. Hasil rule berbentuk perubahan intent, zona, fungsi, benefit, atau risk—bukan bonus/penalti tanpa arti.

```text
facts + phase + topology + instructions
                 ↓
          matching predicates
                 ↓
       structural transformations
                 ↓
 occupied/vacated zones + findings + explanation
```

## Why a Numeric Pair Matrix Is Rejected

Model berikut tidak cukup:

```text
IWB + IF = +8
Libero + IWB = -10
```

Alasannya:

- pasangan yang sama dapat bekerja berbeda pada build-up dan settled defence;
- IWB kiri hanya berinteraksi langsung dengan role yang relevan pada sisi atau koridor yang sama;
- interaksi dapat berubah karena duty, formation, mentality, dan team instruction;
- sebuah kombinasi biasanya membawa benefit dan risk sekaligus;
- SI mendokumentasikan behaviour bersyarat, bukan compatibility score universal;
- angka tunggal tidak dapat menjelaskan apa yang bergerak, ruang apa yang kosong, atau siapa yang mengompensasi.

## Four Linked Matrices

### Matrix A — Role Intent by Phase

Menjawab: **apa yang ingin dilakukan role-duty ini pada setiap fase?**

Key:

```text
position × role × duty × phase
```

Output:

- line membership;
- width/depth intent;
- occupied and vacated zones;
- on-ball function;
- pressing/screening function;
- transition function;
- evidence class dan confidence.

Matrix ini sudah memiliki fondasi di `RoleDutyProfile`, tetapi perlu diperluas dari sifat global menjadi phase intent.

### Matrix B — Neighbour Interaction

Menjawab: **apa yang berubah ketika dua atau lebih intent bertemu?**

Key:

```text
subject selector × neighbour selector × topology × phase
```

Topology yang didukung:

- `same_side`;
- `opposite_side`;
- `same_line`;
- `line_ahead`;
- `line_behind`;
- `same_channel`;
- `same_half_space`;
- `central_pair`;
- `double_pivot_partner`;
- `back_line_partner`.

Output:

- `widen`, `narrow`, `advance`, `drop`, `hold`, `cover`, `split`, atau `vacate`;
- spatial priority;
- required compensation;
- synergy, collision, conditional risk, atau trade-off.

### Matrix C — Instruction Interaction

Menjawab: **apakah instruksi memperkuat, membatasi, mengubah, atau berkonflik dengan intent?**

Key:

```text
role/duty intent × team instruction × player instruction × phase
```

Relation:

- `reinforces` — arah perilaku sama;
- `moderates` — mengurangi intensitas tanpa mengganti fungsi;
- `overrides` — instruksi dengan precedence yang terbukti mengganti intent;
- `competes` — dua intent meminta ruang/aksi berbeda dan perlu context resolution;
- `independent` — bekerja pada dimensi berbeda;
- `unknown` — belum ada evidence untuk menetapkan hubungan.

### Matrix D — Structural Requirement

Menjawab: **setelah seluruh transformasi, apakah fungsi tim tetap tersedia?**

Key:

```text
phase × required function × tactical objective
```

Contoh function:

- first-line outlet;
- width provider kiri/kanan;
- central progression connector;
- last-line pinning;
- box occupation;
- rest-defence first line;
- rest-defence screen;
- counterpress access;
- recovery cover;
- defensive outlet.

Matrix ini mengevaluasi struktur akhir. Ia tidak menilai role berdasarkan nama.

## Canonical Rule Schema

```ts
interface InteractionRule {
  id: string;
  version: number;
  status: 'active' | 'experimental' | 'disabled';
  evidence: {
    class: 'official-explicit' | 'official-partial' | 'observed' | 'inferred';
    sourceIds: string[];
    confidence: number;
    fmPatch?: string;
  };
  scope: {
    phases: TacticalPhaseId[];
    ballZones?: BallZone[];
    possessionState: 'ours' | 'theirs' | 'turnover';
  };
  subject: RoleSelector;
  neighbours?: NeighbourPredicate[];
  instructions?: InstructionPredicate[];
  structure?: StructurePredicate[];
  effects: RuleEffect[];
  explanation: {
    trigger: string;
    consequence: string;
    benefit?: string;
    risk?: string;
  };
}
```

Selectors harus mendukung matching pada role ID, duty, position, side, line, atau behaviour tag. Gunakan role ID ketika rule benar-benar role-specific; gunakan behaviour tag ketika prinsip berlaku pada kelompok role yang sama.

## Effect Vocabulary

Gunakan effect diskret agar rule dapat diuji:

| Effect | Meaning |
|---|---|
| `occupy_zone` | Menambahkan candidate occupied zone |
| `vacate_zone` | Menandai ruang yang ditinggalkan |
| `shift_zone` | Memindahkan intent relatif terhadap kondisi awal |
| `hold_line` | Mencegah perpindahan line membership |
| `join_line` | Memasukkan pemain ke line lain |
| `cover_zone` | Menetapkan tanggung jawab kompensasi |
| `yield_priority` | Subject tidak mengeksekusi intent karena pemain lain diprioritaskan |
| `preserve_width` | Mempertahankan koridor lebar |
| `add_function` | Menambahkan fungsi struktural |
| `remove_function` | Menghilangkan fungsi struktural |
| `raise_risk` | Menambahkan conditional risk dengan sebab spesifik |
| `add_tradeoff` | Mencatat benefit dan cost bersamaan |

Effect tidak boleh langsung mengubah cohesion score. Metrics dihitung ulang dari struktur setelah semua effect diterapkan.

## Evaluation Order

1. Bentuk facts dari formation, role-duty, phase, mentality, dan instructions.
2. Muat base phase intent dari Matrix A.
3. Jalankan official-explicit neighbour rules dari Matrix B.
4. Jalankan instruction relations dari Matrix C.
5. Jalankan observed dan inferred rules jika tidak bertentangan dengan evidence lebih kuat.
6. Resolusi collision berdasarkan explicit priority; collision tanpa priority tetap `unresolved`.
7. Hitung occupied/vacated zones dan line membership.
8. Evaluasi required functions melalui Matrix D.
9. Turunkan metrics dan findings dari hasil struktur.
10. Buat explanation chain dari rule yang benar-benar terpicu.

## Precedence

Urutan evidence:

```text
official-explicit
> official-partial
> observed
> inferred
```

Urutan specificity jika evidence setara:

```text
role+duty+phase+topology
> role+phase+topology
> behaviour-tag+phase
> generic structural principle
```

Rule dengan evidence lebih lemah tidak boleh membatalkan effect dari evidence lebih kuat. Jika dua rule setara bertentangan dan tidak ada priority resmi, hasilnya `unresolved`, bukan dipilih secara diam-diam.

## Starter Rule Catalogue

Rules berikut dapat menjadi batch pertama karena mempunyai dukungan eksplisit dari artikel positional play FM24 milik SI. Exact frequency dan koordinat tetap unknown.

### `FM24_ROT_AP_YIELDS_SV_CHANNEL`

- Phase: progression, established attack.
- Subject: Advanced Playmaker.
- Neighbour: Segundo Volante yang maju dari pivot.
- Topology: same-side or crossing central channel.
- Effect: AP bergeser; channel progression tersedia bagi SV.
- Classification: official-explicit, contextual.

### `FM24_ROT_DEF_BWM_CENTRAL_COVER`

- Phase: progression.
- Subject: defensive Ball-Winning Midfielder.
- Context: AP–SV rotation aktif.
- Effect: BWM mengambil central cover.
- Classification: official-explicit untuk kombinasi contoh SI.

### `FM24_ROT_WIDE_FORWARD_PRESERVES_WIDTH`

- Phase: progression, established attack.
- Subject: Inverted Winger atau Inside Forward.
- Neighbour: additional midfielder memasuki same-side half-space.
- Effect: preserve width.
- Classification: official-explicit, conditional.

### `FM24_ROT_HALF_BACK_LATERAL_CB`

- Phase: first build-up.
- Subject: Half-Back pada double pivot.
- Context: ditempatkan pada sisi kiri atau kanan pivot.
- Effect: join corresponding centre-back zone.
- Classification: official-explicit; edge cases unknown.

### `FM24_ROT_IFB_BACK_THREE`

- Phase: first build-up, progression.
- Subject: Inverted Full-Back.
- Effect: join central-defender line; retain conventional full-back function out of possession.
- Classification: official-explicit.

### `FM24_ROT_IWB_DM_PAIR_COMPENSATION`

- Phase: first build-up.
- Subject: Inverted Wing-Back.
- Neighbour: deeper same-side DM.
- Effect: IWB joins midfield; DM shifts to form the supporting pair.
- Classification: official-explicit as a possible 3-2 build-up, not universal.

### `FM24_ROT_LIBERO_LINE_COMPENSATION`

- Phase: first build-up, progression.
- Subject: Libero stepping into midfield.
- Neighbour: remaining centre-backs.
- Effect: centre-backs split or cover the vacated line space.
- Classification: official-explicit at intent level; exact width unknown.

### `FM24_COLLISION_IWB_PRIORITY_OVER_LIBERO`

- Phase: first build-up, progression.
- Subject: same-side Libero.
- Neighbour: Inverted Wing-Back targeting the same midfield space.
- Effect: Libero yields priority and holds the defensive line.
- Classification: official-explicit.

## Example Rule Record

```ts
{
  id: 'FM24_COLLISION_IWB_PRIORITY_OVER_LIBERO',
  version: 1,
  status: 'active',
  evidence: {
    class: 'official-explicit',
    sourceIds: ['SI_FM24_POSITIONAL_PLAY'],
    confidence: 95,
    fmPatch: 'FM24'
  },
  scope: {
    phases: ['build_up', 'progression'],
    possessionState: 'ours'
  },
  subject: { roleIds: ['lib'], side: 'same_as_neighbour' },
  neighbours: [{ roleIds: ['iwb'], relation: 'same_side', targetsSameZone: true }],
  effects: [
    { type: 'yield_priority', to: 'neighbour' },
    { type: 'hold_line', line: 'defensive' }
  ],
  explanation: {
    trigger: 'Libero dan IWB sisi yang sama menargetkan ruang midfield yang sama.',
    consequence: 'IWB mendapat prioritas; Libero bertahan pada defensive line.',
    benefit: 'Menghindari dua pemain mengisi ruang yang sama.',
    risk: 'Rencana menggunakan Libero sebagai midfield stepper tidak terealisasi.'
  }
}
```

## Matrix Authoring Template

| Rule ID | Phase | Subject | Neighbour/context | Topology | Trigger | Effect | Benefit | Risk | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---:|
| `...` | `...` | `...` | `...` | `...` | `...` | `...` | `...` | `...` | `...` | `0–100` |

Gunakan tabel ini untuk authoring dan review manusia. Runtime memakai record terstruktur agar predicates dan effects dapat diuji.

## Guardrails

- Compatibility bukan angka universal; hasil selalu terkait fase dan objective.
- Benefit dan risk dapat muncul bersamaan.
- `unknown` adalah hasil yang valid.
- Absennya rule berarti “belum diketahui”, bukan “tidak ada interaksi”.
- Confidence menunjukkan kekuatan evidence, bukan besarnya efek.
- Structural metric diturunkan setelah rule resolution; rule tidak menulis skor akhir.
- Player quality menentukan execution confidence pada tahap berikutnya, bukan mengubah role intent.

## Implementation Gate

Implementasi runtime dimulai setelah vocabulary berikut disepakati:

1. daftar tactical phases;
2. daftar zone dan topology;
3. effect vocabulary;
4. evidence precedence;
5. treatment untuk unresolved collision.

Setelah gate tersebut, implementasikan delapan starter rules terlebih dahulu dan buktikan dengan fixture sebelum memperluas Matrix C dan Matrix D.
