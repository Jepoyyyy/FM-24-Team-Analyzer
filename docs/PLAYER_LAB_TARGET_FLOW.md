# Player Lab Target Flow

## Product boundary

The application has two squad sources:

1. three built-in mock squad presets, usable across the whole application without import;
2. one imported squad snapshot built from an attribute HTML export and a performance HTML export.

Player Lab is a separate, tactic-scoped analysis page. It does not calculate every role matrix during initial application load.

## Import flow

```text
Open Import Squad
       ↓
Select Attribute View HTML + Performance View HTML
       ↓
Parse both files independently
       ↓
Validate required identity columns and report coverage
       ↓
Create player records from Attribute View
       ↓
Merge Performance View into those records by FM UID
       ↓
Fallback to normalized name only when UID is absent and unique
       ↓
Show unmatched / duplicate / malformed rows before confirmation
       ↓
Persist one Imported Squad Snapshot
       ↓
Return user to the main builder
```

The merge must not use player name as its primary key. The supplied exports contain matching UID values for all 26 players; UID is safer against duplicate names, accents, and display-name changes.

The import modal requires two explicit file slots:

- `Attribute view`;
- `Performance view`.

Import is atomic: the active squad is replaced only after both files parse and merge successfully. A failed performance file must not leave a half-imported attribute squad active.

## Builder flow

After import, the user returns to the main page and selects or edits a formation. The application persists:

- imported squad snapshot identifier and player records;
- active formation;
- slots with position, role, and duty;
- team instructions relevant to functional demand.

Changing the formation marks prior Player Lab analysis stale. It does not eagerly recalculate the matrix.

## Lazy Player Lab evaluation

```text
Navigate to Player Lab
       ↓
Fetch/read active squad snapshot + active tactic
       ↓
Build demands for every tactic slot
       ↓
Build eligible and transferable candidates
       ↓
Calculate attribute capacity + reliability-adjusted performance
       ↓
Aggregate slot fit into formation fit
       ↓
Render sortable general table
```

Evaluation begins when Player Lab is requested. The result may be cached by:

```text
squadSnapshotId + tacticFingerprint + matrixModelVersion
```

Changing any of those values invalidates the cached result.

## General ranking table

One row represents one player. Default sorting is descending `formationFit`, meaning suitability for the complete active formation—not general player quality.

Required sortable columns:

- player;
- natural positions;
- best tactic slot;
- recommended role-duty;
- formation fit;
- attribute capacity;
- adjusted performance;
- sample reliability;
- import coverage;
- candidate type: natural, familiar, or experimental.

When multiple formation slots suit the same player, the row shows the best slot while retaining the alternative slot scores in the detail model. Future XI optimization must solve assignment conflicts separately; the same player cannot occupy two slots.

## Selected-player explanation

Clicking a row opens the explanation area below the table. It must show:

1. position-relevant attributes, their weights, normalized contribution, missing inputs, strengths, and bottlenecks;
2. role-relevant performance metrics with raw value, adjusted value, minutes, denominator when available, reliability, and baseline;
3. expected behavior for the selected position–role–duty across tactical phases;
4. how mentality and team instructions change the functional demand;
5. exact reasons the player gained or lost score;
6. positional familiarity or experimental-position penalty;
7. alternative slots and what responsibility would need compensation.

The explanation must reconcile to the displayed score; no hidden unexplained modifier is permitted.

## Hexagonal comparison chart

The adjacent hexagonal chart compares six behavior axes:

1. defensive security;
2. ball progression;
3. chance creation;
4. penetration and scoring;
5. width and delivery;
6. physical coverage and repeatability.

The selected player's polygon is compared with the median of players in the same candidate cohort. A second comparison line may show the role-duty demand target. Each axis is composed only from evidence relevant to that behavior and exposes its confidence.

The chart is explanatory, not an additional independent score.

## Out-of-position candidates

Out-of-position inclusion is permitted only as an optional `Experimental candidates` group. A player qualifies when:

- transferable attribute coverage is sufficient;
- transferable attribute capacity meets the role minimum;
- relevant observed performance has usable coverage;
- the move is position-family plausible;
- positional unfamiliarity remains visible as a separate risk.

Initial plausible position-family transfers:

- DR ↔ WBR, DL ↔ WBL;
- MR ↔ AMR, ML ↔ AML;
- DM ↔ MC;
- MC ↔ AMC when creative/arrival evidence qualifies;
- AMC ↔ STC for suitable link/scoring roles;
- DC ↔ defensive full-back only when wide-defence and recovery evidence qualifies.

The engine must not recommend implausible transfers solely because a few attributes are high. Experimental candidates never outrank natural candidates through removal of the familiarity risk; users can include or exclude them from sorting.

## Current-export interpretation

The supplied Palermo exports contain matching UID values for 26 players. Current performance samples are mostly zero to 270 minutes, so most performance verdicts must remain `insufficient evidence` or `early observation`. Attributes can still produce capacity estimates, but raw early-season performance must not dominate formation fit.

## Acceptance scenarios

1. Two players have the same name but different UID: they remain separate.
2. A performance record has no attribute match: import reports it and does not silently create a partial player.
3. A player has attributes but no performance row: capacity remains available; performance is unknown.
4. A 13-minute high performer does not outrank a stable larger sample through raw output alone.
5. Formation changes after analysis: cached ranking is marked stale and recalculated on the next Player Lab request.
6. A natural full-back and an experimental midfielder have similar evidence: the natural player remains safer, while the midfielder is visibly offered as experimental.
7. Clicking any score reveals components whose contributions reconcile to the displayed total.
