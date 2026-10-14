# Tactic Squad Matrix Implementation Report

## Implemented

- 44 declared FM24 roles expanded to 85 role-duty definitions.
- Active tactic slots determine the comparison cohorts.
- Only players with exact exported position eligibility enter a slot cohort.
- Imported players and performance data persist with tactic state.
- HTML parser supports identity, multi-position strings, attributes, minutes, appearances, and role-performance statistics.
- Missing attributes and metrics stay missing and are reported as coverage.
- Exported total minutes are explicitly treated as a capped-confidence minutes proxy.
- Ranking uses performance evidence when available and falls back to attribute capacity when performance is unavailable.
- Player Matrix remains an independent `/player-matrix` page.

## Browser scenario

An HTML fixture containing two right-sided defenders was uploaded through the real Import Skuad interface. The parser imported both players, retained their statistics, persisted them, and exposed the active tactic's 11 slots to Player Matrix. No browser console errors were produced.

For a Wing-Back (Attack) comparison:

| Player | Minutes | Capacity | Raw performance | Evidence |
|---|---:|---:|---:|---:|
| Stable Fullback | 1,980 proxy | 69.7 | 65.7 | 55.9 |
| Explosive Cameo | 315 proxy | 72.4 | 85.2 | 52.5 |

The cameo retains its superior raw performance but ranks below the stable sample after reliability adjustment.

## FM view artifact status

The supplied example files are binary `afe.` FMF containers. A valid customized FMF cannot be synthesized or verified in this workspace because the matching FM24 installation and Resource Archiver are absent. The project instead contains:

- a downloadable machine-readable column manifest;
- an exact in-game construction/export guide;
- the parser that consumes the resulting HTML.

The existing `fmdatalab_moneyball_squad_view.fmf` can be used as the base inside FM24. After adding missing manifest columns, FM24 itself should export the canonical `fmtools_player_matrix_squad_view.fmf`.

Sports Interactive community guidance confirms that `Ctrl+P` can export squad/custom views as a web page and that the Resource Archiver is the tool used to extract FMF containers:

- https://community.sports-interactive.com/forums/topic/429312-can-you-exportimport-notes-from-calendar/
- https://community.sports-interactive.com/forums/topic/566358-what-resource-archiver-for/

## Verification

- ESLint: passed.
- TypeScript: passed.
- Matrix tests: 6 passed across the reliability and tactic-cohort suites.
- Definition completeness: all declared role-duty combinations have a metric set.
- Real browser HTML import: passed.
- Matrix route after import: passed with 2 players, 2 performance records, and 11 tactic slots.
- Browser console: zero errors after hydration fix.

## Calibration warning

The role-to-metric families and their initial baselines remain product hypotheses. Coverage is complete in software terms, but predictive calibration still requires real exported squad datasets across multiple competitions and seasons.
