# FM24 Role-Duty Behaviour and Match-Phase Research

**Status:** research baseline for builder/analysis-engine design  
**Scope:** Football Manager 2024 desktop Match Engine; role-duty behaviour and phase-aware tactical modelling  
**Verified:** 2026-10-08  
**Evidence rule:** a statement is labelled **Official fact** only when Sports Interactive (SI) or the official Football Manager site states it. Everything else is labelled **Inference**, **Proposal**, or **Unknown**.

## Executive conclusion

FM24's official public material supports a contextual, phase-aware model, but it does **not** publish a complete role-duty specification or the Match Engine's formulas. The strongest official evidence says that:

- a player's in-possession location may differ from the nominal formation because of their role **and the roles/movement around them**;
- the shape can change across attacking phases;
- teammates compensate for selected rotations;
- competing roles can have explicit spatial priority;
- attributes, positional familiarity, fatigue, traits, tactical instructions, and teammates affect whether intended behaviour is executed successfully.

Therefore, the builder should not encode a role as one fixed coordinate, one risk number, or one isolated text description. Each role-duty requires a behavioural profile evaluated against the current phase, ball zone, neighbouring roles, instructions, and available player capability.

The public sources are sufficient to define the **schema and reasoning architecture** below. They are not sufficient to claim exact FM24 replication. Complete values for every role-duty must remain unverified until supported by in-game descriptions and controlled observation.

## Source hierarchy

Use sources in this order and preserve the evidence class in data:

1. **FM24 official feature/development articles** — authoritative for explicitly described FM24 Match Engine changes and examples.
2. **FM24 official SI manual** — authoritative for player attributes, positional familiarity, and other documented game concepts.
3. **FM24 in-game role, duty, player-instruction, and team-instruction descriptions** — authoritative product copy, but must be captured from a legally owned installation and version-stamped before it becomes data.
4. **Statements by identifiable SI developers/staff** — supporting evidence only; record author, date, context, and whether it describes FM24 specifically.
5. **Controlled FM24 observations** — empirical evidence, not official fact. These can estimate behaviour but not reveal hidden formulas.
6. **Football theory and community analysis** — useful for interpretation and hypothesis generation, never evidence of Match Engine behaviour.

An SI-hosted community forum post is **not** automatically official. Only the content of an identifiable SI staff statement qualifies, and even then its scope must be checked.

## What official sources establish

### Role behaviour is contextual

**Official fact.** FM24 can move some players to a position different from their nominal starting position while the team has possession, based on both their own role and the roles around them. SI's worked 4-2-3-1 example says the Advanced Playmaker moves laterally when recognising the Segundo Volante's forward run; the defensive Ball-Winning Midfielder becomes more central to cover. The result can become a 4-1-4-1 attacking shape. [SI: positional play and rotations in FM24](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play)

**Official fact.** Those rotations also apply to aggressive midfield roles such as Roaming Playmaker and Mezzala. Inverted Wingers and Inside Forwards may remain wider when an additional midfielder enters their same-side half-space. [SI: positional play and rotations in FM24](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play)

**Inference.** A role profile must expose conditional responses such as `vacate`, `occupy`, `cover`, `widen`, and `narrow`, rather than only a preferred destination. The trigger may be a teammate entering or leaving a zone.

### Confirmed FM24 role-specific behaviours

| Role / combination | Officially documented FM24 behaviour | Evidence boundary |
|---|---|---|
| Advanced Playmaker with an aggressive pivot runner | Can move across to open a channel for the forward-running pivot | Confirmed in SI's specific 4-2-3-1 example; not a universal movement guarantee |
| Segundo Volante | Can attack beyond the Advanced Playmaker and operate as a second number 10 in the documented combination | Exact frequency, duty differences, and triggers are unpublished |
| Defensive Ball-Winning Midfielder | Can occupy a more central covering location in that rotation | Do not generalise to every BWM setup without observation |
| Inverted Winger / Inside Forward | Can stay wider when an additional midfielder advances into the same-side half-space | Exact ball zones and width values are unpublished |
| Half-Back in a double pivot | Can take the left or right centre-back position in possession, depending on placement | Duty/formation edge cases are unpublished |
| Inverted Full-Back | Defends as a conventional full-back; becomes a third central defender in possession | SI explicitly describes this phase split |
| Back three containing an Inverted Full-Back | The outside defenders behave like Wide Centre-Backs; the ball-side outside defender may advance slightly to support | Exact height and risk are unpublished |
| Inverted Wing-Back + deeper same-side DM | IWB can move into midfield; the deeper DM can move across to form a pair | SI illustrates a possible 3-2 build-up, not a guaranteed shape in every configuration |
| Libero | Can step into defensive midfield; in FM24 it is available in a back four and all three central-defender slots of a back three | Duty-specific height and timing are unpublished |
| Centre-backs behind an advancing Libero | Adjust to the Libero leaving the line; a remaining pair can split wider to cover | Exact width and transition timing are unpublished |
| Same-side Libero + Inverted Wing-Back | The Libero does not advance because the IWB has priority when both target the same space | This is the clearest official role-collision precedence rule |

All behaviours in this table come from SI's FM24 positional-play feature article. [SI: Truer Football Motion, Match Authenticity & Positional Play](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play)

### Intended behaviour is not guaranteed execution

**Official fact.** Positional familiarity directly modifies a player's competence in that position; lower familiarity particularly affects positioning and decisions. [SI FM24 Manual: players and positions](https://community.sports-interactive.com/sigames-manual/football-manager-2024-fr/joueurs-r5004/)

**Official fact.** Decisions describes making appropriate choices; Off the Ball contributes to reading attacking play and getting into positions to receive; Positioning concerns defensive phases and being appropriately placed in the current tactical scheme; Teamwork concerns following tactical instructions and cooperating with teammates. The manual also says Teamwork contributes to whether a player follows a trait instead of a tactical instruction. [SI FM24 Manual: mental attributes](https://community.sports-interactive.com/sigames-manual/football-manager-2024-fr/joueurs-r5004/)

**Official fact.** Low Stamina causes a player to tire faster and reduces the quality of their contribution in all phases as fatigue rises. [SI FM24 Manual: physical attributes](https://community.sports-interactive.com/sigames-manual/football-manager-2024-fr/joueurs-r5004/)

**Inference.** Builder output must distinguish:

- **role intent:** what the selected role-duty asks for;
- **structural consequence:** spaces occupied/vacated if intent is executed;
- **execution confidence:** how reliably this player may realise the intent;
- **observed result:** what match evidence shows actually occurred.

It is invalid to conclude that a role's intended shape will always appear, or that failure to appear proves the role definition wrong.

### FM24 roles bundle behaviour across possession states

**Official fact (retrospective architecture statement).** When introducing the FM26 dual-formation system, SI stated that the earlier role system—whose in-possession roles were reviewed from FM24—provided player instructions for both when a team had the ball and when it did not. SI also said FM26 removed Duties and reduced hard-coded instructions attached to roles. This is official evidence that FM24 role-duty selections bundled multi-state and hard-coded behaviour, but it does not expose those hidden instructions. [SI: FM26 tactical evolution and review of FM24 roles](https://www.footballmanager.com/fm26/features/possession-out-possession-fm26s-new-tactical-evolution)

**Inference.** The internal FM24 model should keep role and duty as a single versioned behaviour package. It should not assume duty merely changes vertical depth or forward-run count.

## Required role-duty behaviour record

This is the minimum proposed source-of-truth schema for every supported `position × role × duty` combination.

| Field | Meaning | Evidence expectation |
|---|---|---|
| `id`, `fmVersion`, `position`, `role`, `duty` | Stable identity | Exact in-game availability |
| `officialDescription` | Short, copyright-safe paraphrase of in-game copy | In-game description + capture/version metadata |
| `evidence[]` | URL/capture, claim, source tier, verified date | Required per non-null claim |
| `confidence` | `official-explicit`, `official-partial`, `observed`, `inferred`, `unknown` | Never silently promote inference |
| `nominalBaseZone` | Formation slot before dynamic behaviour | Formation position, not claimed average position |
| `phaseIntents` | Behaviour for each defined phase | Can be partial/unknown |
| `ballZoneResponse` | Expected response by defensive/middle/attacking third and left/centre/right channel | Usually observational unless SI explicitly states it |
| `possessionState` | Behaviour while team has ball, opposition has ball, or possession changes | Preserve state distinctions |
| `widthIntent` | hold width, half-space, centre, adaptive | Include triggers and uncertainty |
| `depthIntent` | drop, hold, support, penetrate, lead line, adaptive | Relative, never fake exact coordinates |
| `movementIntents[]` | advance, drop, overlap, underlap, roam, hold, cover, split, shift | Each with trigger/phase |
| `onBallIntents[]` | receive, carry, recycle, progress, create, cross, shoot, hold | Treat as tendencies, not deterministic actions |
| `outOfPossessionIntents[]` | line membership, press, screen, mark, cover, track, outlet | Partial until verified |
| `transitionOnWin` | immediate outlet/support/carry/run/recycle intention | Must be separated from settled possession |
| `transitionOnLoss` | counter-press/recover/hold/protect-space intention | Must be separated from settled defending |
| `zonesOccupied[]` | Candidate zones occupied under stated context | Conditional set, not one point |
| `zonesVacated[]` | Zones whose coverage may be removed | Drives warnings |
| `compensationExpected[]` | Teammate movements required or officially observed | Example: remaining CBs split after Libero advances |
| `collisionRules[]` | Same-zone conflicts, priority, fallback | Official priority where known; otherwise unknown |
| `neighbourTriggers[]` | Conditional reaction to surrounding roles/movement | Required for FM24 positional play |
| `formationConstraints[]` | Back-two/back-three/double-pivot and side constraints | Do not extrapolate across structures |
| `instructionOverrides[]` | Team/player instructions that modify or conflict with default role behaviour | Values require in-game capture/experiments |
| `attributeExecutionFactors[]` | Attributes/familiarity affecting execution | Link only documented relationships as official |
| `risks[]` | Structural exposure and execution risk | Must state cause, context, and confidence |
| `unknowns[]` | Timing, frequency, thresholds, edge cases not established | Mandatory, not optional |

### Behaviour must be conditional

A record must support rules like:

```text
IF possession = established
AND same_side_half_space is occupied by an advancing midfielder
THEN IW/IF widthIntent may become wider
SOURCE = official-explicit
CONFIDENCE = contextual, not universal
```

and:

```text
IF Libero and IWB are on the same side
AND both would enter the same midfield space
THEN IWB has priority; Libero remains in the defensive line
SOURCE = official-explicit
```

This is materially safer than assigning `IF = narrow` or `Libero = DM` unconditionally.

## Proposed phase model for the builder

SI explicitly says FM24 shapes adjust across different **phases of attack**, but it does not publish a formal phase taxonomy. [SI: FM24 positional rotations](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play)

The following is therefore a **product modelling proposal**, not an SI-provided state machine:

| Phase ID | Operational definition | Required analysis |
|---|---|---|
| `opp_set_piece` | Opposition dead-ball restart | Separate routine/personnel model; excluded from open-play role assumptions |
| `settled_low_defence` | Opposition has stable possession near our goal | Block lines, width/depth, box/half-space coverage, outlet structure |
| `settled_mid_defence` | Opposition circulates against a settled middle block | screen access, compactness, steering, marking/press responsibilities |
| `high_press` | Opposition build-up is engaged high | first line, cover shadow/screen, backing distances, space behind press |
| `defensive_transition` | Possession has just been lost; shape not settled | counter-press participation, recovery routes, rest-defence exposure |
| `regain_transition` | Possession has just been won; opponent not settled | outlet availability, forward support, security/recycle options |
| `first_build_up` | Controlled possession starts in defensive third | first line, goalkeeper involvement, build-up base, press escape options |
| `progression` | Controlled possession seeks to cross midfield/lines | connectors, width, half-space occupation, passing lanes, rotations |
| `established_attack` | Stable possession around opposition block | occupation of five lanes, overload/isolation, box occupation, circulation security |
| `final_action` | Immediate chance creation/shot/cross/cutback sequence | targets, creators, rebound zones, turnover risk |
| `own_set_piece` | Our dead-ball restart | Separate routine/personnel model |

### Why these phases are defensible

- **Official fact:** SI distinguishes defending from being in possession for the Inverted Full-Back, and describes in-possession build shapes and dynamic attacking phases. [SI: FM24 positional play](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play)
- **Official fact:** FM24's set-piece system models attacking and defending preferences separately, includes counter-attacking intent from opposition set pieces, and assigns responsibilities based on player attributes rather than fixed formation positions. [SI: FM24 Set Pieces refresh](https://www.footballmanager.com/features/set-pieces-refresh-and-coaches-debut)
- **Inference:** settled defence, pressing, transition, build-up, progression, and established attack must be separate analytical states because the same role can defend in one line and occupy another location with the ball; transition risk cannot be derived from either settled shape alone.

### Phase resolution inputs

The analysis engine should resolve phase from observable state, not elapsed time alone:

- possession owner and time since turnover;
- restart/open-play state;
- ball third and channel;
- whether each team has reached a stable compact shape;
- height of the opposition's active pressure;
- current role-induced rotations;
- number and location of players behind, level with, and ahead of the ball.

Thresholds for “time since turnover” or “settled” are **Unknown** for FM24 and must not be advertised as Match Engine constants.

## Builder reasoning contract

For each phase, derive four separate outputs:

1. **Intended shape** — conditional zones implied by selected role-duty packages.
2. **Coverage and connections** — occupied/vacated zones, line membership, passing/support relationships, and collision/compensation rules.
3. **Execution confidence** — player familiarity and documented attribute dependencies; later enriched by the user's planned player model.
4. **Explanation** — `change → tactical consequence → reason → evidence class → confidence`.

Example wording:

> In established possession, the same-side Inside Forward may remain wider because the Segundo Volante advances into that half-space. This can preserve width and avoid two players targeting the same channel. SI explicitly documents this adaptive FM24 behaviour; the exact frequency is not public.

Warnings should state the conditional chain, never merely “danger”:

> In the proposed build-up shape, the Libero and same-side Inverted Wing-Back target a similar midfield space. FM24 gives the Inverted Wing-Back priority in this specific collision, so the Libero will not advance. If the tactical goal requires the Libero as the midfield stepper, change one of those roles.

## Coverage and evidence gaps

### Covered by explicit FM24 official evidence

- contextual attacking rotations;
- worked AP–Segundo Volante–defensive BWM interaction;
- adaptive width of IW/IF around a half-space runner;
- Half-Back lateral centre-back positioning in a double pivot;
- Inverted Full-Back possession-state split;
- IWB + deeper-DM compensation and possible 3-2 build-up;
- enhanced Libero movement and defensive-line compensation;
- Libero/IWB same-space priority;
- positional familiarity, selected attribute meanings, and fatigue effect;
- set-piece separation and attribute-based assignment.

### Not covered comprehensively

- a complete FM24 list of all valid `position × role × duty` combinations;
- official descriptions for every role, duty, and locked instruction;
- exact difference between Defend, Support, and Attack for every role;
- exact mentality modifiers on role-duty behaviour;
- exact team/player-instruction precedence;
- pressing trigger thresholds, marking handoffs, and recovery-run logic;
- role movements by ball third and lateral ball zone;
- frequency/probability of each run, pass, carry, press, or shot;
- numeric coordinates, timing, distances, or risk weights;
- patch-to-patch Match Engine behavioural differences;
- hidden attribute weights or decision formulas.

## Explicit unknowns and prohibited claims

Until new evidence exists, the application must treat the following as unknown:

- the Match Engine source code and decision tree;
- numeric weights used by mentality, duty, roles, attributes, or instructions;
- deterministic “role produces shape X” claims outside the exact SI examples;
- universal role pair compatibility scores;
- exact rest-defence requirements used internally by FM24;
- exact impact of any single instruction when interacting with all other settings;
- which animation-visible movement corresponds one-to-one with an underlying tactical decision;
- whether a community-observed exploit is intended behaviour, a patch-specific imbalance, or sampling noise.

Do not label any of the following as official without direct evidence:

- “Attack duty always makes more forward runs” as a complete definition of duty;
- “Mentality only changes depth and runners”;
- “This role always occupies this coordinate”;
- “This combination is good/bad in FM24” based only on football theory;
- “This setup reproduces FM24 exactly.”

## Next evidence-acquisition step

Before implementing a complete role matrix:

1. capture every FM24 desktop role-duty description and its locked player instructions from one identified final FM24 patch;
2. record valid positions/duties and localise role names to stable internal IDs;
3. convert only explicit statements into `official-explicit` fields;
4. leave absent behaviours as `unknown`, not guessed defaults;
5. design controlled observational fixtures for unresolved movement, duty, mentality, and instruction interactions;
6. store observations separately with save/database, patch, formation, roles, instructions, player profiles, opponent setup, sample size, and uncertainty;
7. connect each implemented rule to at least one source/observation ID and one regression test.

This sequence creates a useful FM24-aware model without pretending that public information exposes the original Match Engine.

## Primary sources

- Sports Interactive, [Truer Football Motion, Match Authenticity & Positional Play](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play), 26 September 2023.
- Sports Interactive, [Football Manager 2024 Manual: Players](https://community.sports-interactive.com/sigames-manual/football-manager-2024-fr/joueurs-r5004/), accessed 8 October 2026. The accessible official page is French; claims above are conservative translations of the definitions.
- Sports Interactive, [Set Pieces Refresh and Coaches Debut](https://www.footballmanager.com/features/set-pieces-refresh-and-coaches-debut), 29 September 2023.
- Sports Interactive, [In Possession, Out of Possession: FM26's New Tactical Evolution](https://www.footballmanager.com/fm26/features/possession-out-possession-fm26s-new-tactical-evolution), used only for SI's retrospective architectural statements about the FM24 role system.

