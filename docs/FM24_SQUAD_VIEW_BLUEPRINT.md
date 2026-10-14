# FM24 Squad View Blueprint for Player Matrix

## Deliverables

- Machine-readable column manifest: `public/fmtools_squad_view_columns.csv`
- HTML parser aliases: `src/engine/parser.ts`
- Role requirements: `src/engine/v2/tacticPlayerMatrix.ts`

## Important FMF constraint

The supplied `.fmf` examples begin with the binary `afe.` container signature. They are not editable XML or JSON view definitions. This workspace does not contain Football Manager 2024 or the matching Resource Archiver, so generating a new binary `.fmf` here would be unverified and could produce a file rejected by the game.

Use `fmdatalab_moneyball_squad_view.fmf` as the in-game base view, then add any columns listed as missing in `fmtools_squad_view_columns.csv`. Export that customized view from FM24 itself. The game-created result is the canonical `fmtools_player_matrix_squad_view.fmf`.

Do not rename a text/CSV file to `.fmf`; that does not create a valid FM view.

## Installation and export workflow

1. Put the source squad-view `.fmf` in the FM24 `views` folder under the user Sports Interactive directory.
2. In FM24 Squad, choose **Import View** and select the view.
3. Use **Customise Current View** to add missing manifest columns.
4. Save/export the customized view from FM24 as `fmtools_player_matrix_squad_view.fmf`.
5. Select all player rows in Squad, press `Ctrl+P`, and choose **Web Page**.
6. Import the resulting `.html` into FM Tools.

## Why one broad squad view

The application uses the active tactic to select relevant fields per role. A single broad export is therefore preferable to asking the user for separate goalkeeper, defender, creator, and striker exports. Missing columns remain visible as missing-data warnings; they are never replaced with zero or league-average values.

## Current coverage

The catalog is generated from all roles declared in `ALL_ROLES`: 44 roles and 85 role-duty combinations. Role metrics are composed from nine function families: goalkeeper, defending, progression, wide play, ball winning, creation, running, scoring, and target/link play.

## Minutes limitation

The standard squad HTML export normally supplies total minutes, not exact minutes spent in a specific role-duty. The parser therefore stores exported minutes as `total_minutes_proxy`. The UI labels them `(proxy)` and caps their reliability contribution. Exact `role_minutes` require match-segment or role-history data that is not present in a normal squad view.
