# Player Matrix Engine Behavior Report

**Model:** `role-evidence-0.2.0`  
**Date:** 2026-10-10  
**Scope:** reliability adjustment, comparable-role ranking, mock-data behavior, and isolated page behavior.

## 1. What the engine now does

The engine keeps four values separate:

1. **Attribute capacity** — the prior estimate of what the player may be capable of doing.
2. **Raw performance** — the match record before sample correction.
3. **Adjusted performance** — raw observations pulled toward the metric's cohort baseline when evidence is sparse.
4. **Evidence score** — adjusted performance with a small uncertainty penalty, used only to rank comparable position–role–duty samples.

Minutes do not add quality points. They increase the amount of trust placed in observed performance. Relevant opportunities also remain mandatory, so high minutes cannot hide a low event sample.

```text
minutes reliability = role-minutes / (role-minutes + 900)
event reliability   = opportunities / (opportunities + metric stabilization constant)
sample reliability  = sqrt(minutes reliability × event reliability)
reliability          = sample reliability × context stability modifier

adjusted value = reliability × observed value
               + (1 − reliability) × cohort baseline
```

The constants and mock baselines are product hypotheses. They require calibration against a larger historical dataset before the matrix can claim predictive validity.

## 2. Mock dataset coverage

The page currently includes six deliberately different samples across three exact role cohorts:

- GK · Goalkeeper (Defend): perfect short sample, stable good sample, and high-attribute underperformance;
- DR · Wing-Back (Attack): stable balanced sample versus explosive cameo sample;
- AMR · Inside Forward (Attack): established high-minute sample.

Each sample contains exact role-minutes, starts, substitute segments, stability, attribute capacity, metric observations, and metric-specific relevant opportunities.

## 3. Observed engine results

### Goalkeeper (Defend)

| Rank | Sample | Role-min | Raw | Adjusted | Evidence | Reliability gate |
|---:|---|---:|---:|---:|---:|---|
| 1 | Mark Henderson · stable sample | 1,980 | 66.0 | 60.3 | 58.9 | Usable |
| 2 | David Raya · short sample | 180 | 97.5 | 58.7 | 51.9 | Insufficient |
| 3 | Ederson · tactical mismatch | 1,710 | 41.4 | 44.9 | 43.2 | Usable |

Behavior:

- the 180-minute perfect sample remains visible as `97.5` raw;
- it is pulled to `58.7` adjusted because it contains only 8 shot-stopping opportunities and 5 cross-claim opportunities;
- the stable 1,980-minute sample ranks first even though its raw output is much lower;
- Ederson's high attribute capacity (`88`) does not conceal low observed performance. The engine emits a tactical-access/context diagnostic instead of declaring the player's attributes false.

This is the intended answer to the core scenario: **perfect statistics over a tiny sample do not automatically beat good statistics sustained over a much larger sample.**

### Wing-Back (Attack)

| Rank | Sample | Role-min | Raw | Adjusted | Evidence | Reliability gate |
|---:|---|---:|---:|---:|---:|---|
| 1 | Benjamin White | 1,620 | 61.4 | 56.4 | 54.7 | Usable |
| 2 | Kyle Walker · cameo role | 315 | 83.7 | 56.9 | 53.8 | Low evidence |

Behavior:

- the cameo sample retains a slightly better adjusted mean (`56.9` versus `56.4`);
- its higher uncertainty produces a lower evidence score (`53.8` versus `54.7`);
- therefore the stable sample narrowly ranks first without erasing the possibility that the cameo performance is genuinely better.

This avoids both failure modes: blindly rewarding raw output and blindly awarding victory to the player with the most minutes.

### Inside Forward (Attack)

| Sample | Role-min | Raw | Adjusted | Evidence | Reliability gate |
|---|---:|---:|---:|---:|---|
| Bukayo Saka | 2,070 | 68.8 | 61.4 | 59.9 | Usable |

Metric behavior:

- npxG/90: `0.48` raw → `0.39` adjusted from 66 opportunities;
- box receptions/90: `5.7` raw → `4.76` adjusted from 148 opportunities;
- pressure-to-regain success: `31%` raw → `27.47%` adjusted from 116 opportunities.

Even at 2,070 role-minutes, the model does not claim certainty because each metric has its own event stabilization requirement.

## 4. UI behavior

The matrix now lives at the independent route `/player-matrix`; it is no longer rendered inside the formation-builder page. The main header links to the route.

The page provides:

- a comparable role cohort selector;
- ranking by evidence score;
- raw and adjusted markers on the same scale;
- exact role-minutes, starts, substitute segments, and event counts;
- per-metric reliability and baseline explanation;
- an inspector that keeps attribute capacity separate from observed output;
- explicit `Insufficient`, `Low evidence`, `Usable`, and `Strong evidence` states.

The page was browser-checked at 1440×1000 and 390×844. Cohort switching worked and the console contained no errors or warnings. The ranking table intentionally scrolls horizontally on narrow screens so metric labels are not collapsed into unreadable abbreviations.

## 5. Verification

- dedicated matrix tests: **4/4 passed**;
- TypeScript: **passed**;
- ESLint: **passed**;
- browser render and interaction: **passed**, zero console errors;
- full Vitest suite: existing environment failure in `jsdom/undici` (`webidl.util.markAsUncloneable`), while node-environment matrix tests pass;
- production build: application type-check passes, but this environment's Turbopack/PostCSS process cannot bind its internal port (`Operation not permitted`). The earlier remote Google-font dependency was removed, so the build is no longer network-dependent.

## 6. Known limitations before real-data integration

- mock `attributeCapacity` values are scenario inputs, not yet computed from a full role-specific attribute catalogue;
- metric baselines and stabilization constants are not calibrated from real FM24 cohorts;
- stability is supplied by the mock dataset rather than derived from match-by-match windows;
- opponent strength, game state, tactical changes, and red-card segments are represented by the model contract but not yet provided as event-level imports;
- the current mock implementation covers three role cohorts, not all FM24 role-duty combinations.

The next reliable expansion is not adding more weights. It is defining the import schema for match segments and relevant opportunity counts, then calibrating one role family at a time.
