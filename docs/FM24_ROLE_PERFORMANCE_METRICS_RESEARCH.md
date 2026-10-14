# FM24 Role Performance Metrics Research

**Status:** research specification; not yet a scoring formula  
**Scope:** every role and duty currently declared in `src/engine/roles.ts`  
**Last verified:** 2026-10-10

## 1. Purpose

This document defines the on-field evidence needed to judge whether a player is actually performing a Football Manager 2024 role. It supplements, rather than replaces, the attribute-based capacity model.

The central distinction is:

```text
attributes = estimated capacity to execute an action
match data = observed actions and outcomes inside a tactical environment
role performance = outcomes + process + opportunity/exposure + reliability
```

A high attribute rating with low output is not automatically evidence that the attribute is wrong or the player is poor. It can indicate insufficient opportunity, unsuitable team structure, an incompatible partner, an instruction conflict, a different match state, or random variation.

Sports Interactive explicitly states that players make many decisions using combinations of attributes and that role-highlighted attributes are not exhaustive. The FM24 manual also explains, for example, that passing success depends on Passing, Vision and Technique rather than one attribute in isolation. [Sports Interactive, FM24 player and attribute manual](https://community.sports-interactive.com/sigames-manual/football-manager-2024-fr/joueurs-r5004/)

## 2. Evidence tiers and availability

Metric labels in this document mean:

- **FM24-confirmed:** explicitly documented by Sports Interactive as available in the Data Hub/player statistics by FM23 and therefore inherited by the FM24 PC/Mac branch unless a save/database lacks the required data.
- **FM24-common:** visible in normal FM24 match/player-stat views, but not exhaustively documented in a single official public metric dictionary. The implementation must verify the exact export/UI field before ingestion.
- **External/derived:** needs event data, manual tagging, exported match events, or a calculation outside the standard FM24 UI.

Sports Interactive confirms that FM's Data Hub provides per-90 variants, open-play xA, open-play key passes and crosses, progressive passes, pressure attempts and successful pressures, sprints, distance covered, PPDA, Field Tilt, passing dynamics and comparison visuals. [Sports Interactive, Data Hub upgrades](https://www.footballmanager.com/features/gameplay-upgrades)

Definitions must be versioned by provider. Opta, for example, defines a tackle only when a player challenges an opponent in controlled possession and distinguishes tackle won/lost by the next possession outcome; it defines xG from chance characteristics and xA as the probability that a completed pass becomes an assist. [Stats Perform, Opta event definitions](https://www.statsperform.com/opta-event-definitions/)

### Core FM24 metric vocabulary

| Family | FM24 fields to ingest | Better external/derived companion |
|---|---|---|
| Minutes/sample | minutes, starts, substitute appearances | role-specific minutes; possessions; in/out-of-possession minutes |
| Shooting | goals, shots, shots on target, conversion, xG/npxG where exposed | xG/shot, post-shot xG, shot locations, touches in box |
| Creation | assists, key passes, chances created, open-play xA | shot-creating actions, xThreat/possession value, passes into box |
| Passing | attempts/completions, pass %, progressive passes | completion over expected, line breaks, destination/pressure/value |
| Carrying | dribbles attempted/completed, distance if available | progressive carries, carry value, dispossessions under pressure |
| Width/delivery | crosses attempted/completed, open-play crosses | cross destination, cutbacks, box entries created, xA per cross |
| Defending | tackles, tackle %, interceptions, blocks, clearances, headers | possession-adjusted actions, pressures by zone, dribbled-past rate |
| Pressing/work | pressure attempts/success, sprints, distance | pressure regains, forced turnovers, counterpress response time |
| Goalkeeping | saves, save %, conceded, clean sheets, distribution | shots on target faced, PSxG, goals prevented, claims above expected |
| Errors/discipline | mistakes leading to shot/goal, fouls, cards | dangerous turnovers by zone, foul cost, expected card/foul model |

## 3. Required evaluation structure

Every role report must contain all five blocks below. A single per-90 number is never sufficient.

1. **Primary outcome KPIs** — whether the role delivered its intended end product.
2. **Process KPIs** — repeatable actions that produce the outcome.
3. **Exposure/context denominators** — how often the player had a realistic opportunity.
4. **Diagnostic gap** — why attributes and observed output may disagree.
5. **Reliability** — minutes, event counts, opponent strength and tactical stability.

Recommended data object:

```ts
type RolePerformanceEvidence = {
  roleId: string;
  duty: string;
  minutesInRole: number;
  outcomes: MetricObservation[];
  processes: MetricObservation[];
  exposures: MetricObservation[];
  context: TacticalContext;
  sampleReliability: 'insufficient' | 'low' | 'usable' | 'strong';
  diagnosticHypotheses: DiagnosticHypothesis[];
};
```

Do not combine matches played in materially different positions, roles or duties. Automatic duty must be resolved to the effective match mentality/duty before aggregation.

## 4. Goalkeeper analysis — mandatory special case

### 4.1 Goalkeeper — Defend

**Primary outcomes**

- save percentage (**FM24-common**), but only beside shots on target faced;
- goals conceded per 90 (**FM24-common**), but not as an individual-only verdict;
- PSxG minus goals conceded / goals saved above average (**external/derived; preferred shot-stopping outcome**);
- errors leading to shots/goals (**FM24-common**);
- claim success and dangerous rebounds (**external/derived**, unless the exact FM field is verified).

**Process KPIs**

- saves by shot zone/type; held versus parried safe/danger;
- one-on-one saves and outcomes;
- cross/high-ball claims, punches and failed claims;
- pass completion split short/medium/long, launch completion, possession retained after distribution;
- touches/actions outside the penalty area only as a secondary GK(D) diagnostic.

**Exposure/context**

- shots on target faced per 90;
- pre-shot xG and preferably PSxG faced per shot;
- share of shots from central, close-range and one-on-one situations;
- defensive line height, pressure on the shooter, blocks and defensive errors;
- crosses entering the keeper's claimable zone;
- back-pass volume and press pressure on distributions.

**Why `saves/90` is misleading**

`saves/90` is primarily an opportunity/load statistic: a keeper behind a weak or passive defence can make many saves while performing below expectation, while a dominant team can expose its keeper to few but very difficult shots. Raw save percentage is `saves / shots on target faced`; it does not adjust for shot placement or difficulty. Post-shot xG adds shot trajectory/placement information and permits goals saved above average. [StatsBomb, post-shot expected goals](https://statsbomb.com/articles/soccer/a-new-way-to-measure-keepers-shot-stopping-post-shot-expected-goals/) StatsBomb's goalkeeper framework treats shot stopping, claims/high balls and distribution as separate jobs and adds positioning, claim activity and sweeping measures rather than collapsing them into saves. [StatsBomb, goalkeeper radars](https://blogarchive.statsbomb.com/articles/soccer/introducing-goalkeeper-radars/)

**High attributes, low output diagnostic**

| Observation | Likely diagnostic, not an automatic verdict |
|---|---|
| High Reflexes/Positioning/One on Ones, low save % | inspect PSxG/shot, close-range share, one-on-one exposure, screens/deflections and sample size |
| High attributes, high saves/90, poor goals prevented | defence allows heavy volume and/or keeper stops easy shots but underperforms difficult ones |
| Low saves/90, high save % | possibly excellent team shot suppression; not enough evidence of individual shot stopping |
| Good shot stopping, frequent rebounds/errors | Handling/decision/process problem hidden by headline save % |
| Poor long distribution completion | may be forced long by press or target availability; compare completion conditional on length and pressure |

**Reliability:** never judge a keeper on a few matches. Goalkeeping has a small event sample and poor short-period repeatability; one StatsBomb research paper notes an average near 4.5 shots on target faced per match and roughly 150 per season, producing wide uncertainty. [StatsBomb, goalkeeper decision research](https://statsbomb.com/wp-content/uploads/2022/11/What-drives-GK-decisions.pdf) Use rolling shot counts and confidence intervals, not only a minutes threshold.

### 4.2 Sweeper Keeper — Defend / Support / Attack

Use all GK(D) metrics plus:

- **Primary:** through balls/sweeps prevented, successful defensive actions outside box, possession value from distribution, dangerous turnovers.
- **Process:** starting position, average sweep distance, claims through-ball attempts, pass/carry progression, short build-up availability.
- **Exposure:** opponent through balls into space, defensive line height, back-pass volume, opposition press and available short outlets.
- **Duty delta:** Defend prioritises safe availability; Support adds progression and moderate sweep range; Attack expects the highest outside-box activity and risk-bearing distribution.
- **Misleading:** raw outside-box actions without through-ball exposure; pass % without pass length/pressure; assists as a primary distribution KPI.

## 5. Shared role-performance archetypes

The following archetypes prevent duplicated formulas. Section 6 maps every implemented role-duty to one archetype plus duty-specific deltas.

### A. Last-line defender

**Roles:** CD, NCB, IFB; defensive portions of BPD, WCB and Libero.

- **Primary:** shots/chances conceded while responsible for zone; duel outcomes; errors leading to shots/goals; progression retained where required.
- **Process:** aerial win %, tackle/dribbled-past outcome, interceptions, blocks, clearances, pressure success, safe passes under pressure.
- **Exposure:** opponent possession, entries into zone, aerial balls contested, isolation/transition events, line height and cover behind.
- **Attribute-output gap:** low tackle counts may mean good positioning or little defending; high clearances may mean heavy pressure, not excellence; poor duel % may follow repeated isolation by structure.
- **Avoid:** clean sheets and team goals conceded as individual scores; raw tackles/interceptions without possession/opportunity adjustment. Defensive actions depend strongly on time without the ball, so possession adjustment is required for comparison. [StatsBomb, possession-adjusted player statistics](https://statsbomb.com/articles/soccer/introducing-possession-adjusted-player-stats/)
- **Reliability:** target at least 900 role-minutes plus meaningful duel/exposure counts; separate back-two and back-three samples.

### B. Progressive centre-back / stepping defender

**Roles:** BPD, Libero, WCB(S/A).

- **Primary:** successful progression into midfield/final third; possession value; chances conceded following own turnover.
- **Process:** progressive/line-breaking passes, completion conditional on difficulty, carries into space, receptions and passes under pressure.
- **Exposure:** build-up touches, available progressive options, opponent press height, team possession, partner coverage.
- **Attribute-output gap:** high Passing/Vision but few progressive passes can mean no receiving lanes or instructions routing build-up elsewhere; many failed progressions may be acceptable if value/risk is positive.
- **Avoid:** overall pass % and total passes as creativity metrics. Counting progressive passes lacks destination and play context; possession-value models are preferable when available. [StatsBomb, unpacking ball progression](https://blogarchive.statsbomb.com/articles/soccer/unpacking-ball-progression/)
- **Reliability:** 500+ attempted passes with opponent-strength and pressure splits is preferable to minutes alone.

### C. Wide defender / wing-back provider

**Roles:** FB, WB, CWB.

- **Primary:** open-play xA, chances created, successful box entries/deliveries, chance quality conceded from own flank.
- **Process:** overlaps and final-third receptions, progressive carries/passes, crosses and cutbacks, successful pressures, recovery actions.
- **Exposure:** same-side winger behaviour, touches/receptions in wide final third, transition distance, opponent winger threat, team possession.
- **Attribute-output gap:** good Crossing with low xA may be caused by few high-value receiving targets, early/deep delivery, no overlap access or opponent blocks; good Pace/Stamina with weak recovery outcome can mean the role leaves excessive distance or lacks cover.
- **Avoid:** cross completion alone, total crosses, tackles per 90, distance covered without intensity/location.
- **Reliability:** require both attacking exposures (final-third wide receptions/deliveries) and defensive exposures; do not compare a FB(D) directly with CWB(A).

### D. Inverting / rest-defence full-back

**Roles:** IWB and IFB.

- **Primary:** central progression/retention, counterattack suppression, possession loss leading to transition, central overload effectiveness.
- **Process:** central receptions, progressive passes, press resistance, interceptions/recoveries after loss, coverage of vacated zones.
- **Exposure:** inversion opportunities, midfield occupancy/collisions, wide outlet supplied by teammate, opponent transition routes.
- **Attribute-output gap:** capable passer with low progression may be blocked by an occupied pivot; low tackles may reflect successful rest-defence spacing; repeated wide concessions may mean no teammate maintains flank coverage.
- **Avoid:** crosses as a primary KPI, overall pass %, or expecting conventional overlap output.
- **Reliability:** tag possession shape and neighbour roles; otherwise data cannot distinguish player failure from zone collision.

### E. Holding midfielder / space controller

**Roles:** DM(D/S), Anchor, Half Back, Carrilero; defensive side of DLP(D) and BWM(D).

- **Primary:** central progression denied, dangerous transitions stopped/delayed, ball retention and safe circulation.
- **Process:** interceptions, possession-adjusted tackles, pressure regains, central recoveries, passing outlets, dangerous turnovers.
- **Exposure:** opponent central possessions/transitions, team possession, full-back advances, distance to defensive line, pressing scheme.
- **Attribute-output gap:** few defensive actions can mean excellent spacing and opponent avoidance; many tackles can signal structural overload. Half Back must additionally be judged on build-up back-line formation and cover, not only midfield events.
- **Avoid:** raw tackle volume, goals/assists, overall pass completion without direction.
- **Reliability:** use team-on/team-off or stable tactical blocks cautiously; individual event data alone cannot directly observe space denied.

### F. Ball winner / presser

**Roles:** BWM(D/S), PF(D/S/A), high-press component of SS.

- **Primary:** pressure regains/forced failures, turnovers won in valuable zones, chances created after regains; fouls/cards and space bypassed are negative outcomes.
- **Process:** pressure attempts and success, sprint/pressure repeatability, tackles, interceptions, counterpress response.
- **Exposure:** opponent possession/pass opportunities in pressing zone, team PPDA, pressing support and trap direction.
- **Attribute-output gap:** high Work Rate/Aggression with few regains may mean isolated pressing or an opponent bypass; many pressures are not automatically effective. StatsBomb defines a pressure broadly as closing an opponent enough to force a decision and separately identifies forced failures/regains. [StatsBomb, pressure event interpretation](https://statsbomb.com/articles/soccer/lets-talk-about-press-baybee/)
- **Avoid:** pressures or tackles alone; PPDA is a team intensity description, not proof one player pressed well.
- **Reliability:** require substantial opponent possessions in the player's pressing zone and analyse coordinated unit behaviour.

### G. Deep distributor / controller

**Roles:** DLP(D/S), Regista, deep RPM, Libero(S).

- **Primary:** valuable progression, stable possession, entries created beyond pressure lines, dangerous turnovers.
- **Process:** progressive/line-breaking passes, switches, receptions under pressure, completion over expected, secondary chance involvement.
- **Exposure:** build-up touches, passing options, opponent pressure, share of team progression routed through player.
- **Attribute-output gap:** low assists do not disprove playmaking; a controller can create pre-assist value. Low progression with high pass % may show sterile circulation or instruction constraints.
- **Avoid:** assists, pass %, or total passes in isolation.
- **Reliability:** 500+ pass attempts across multiple opponents; distinguish set pieces from open play.

### H. Two-way runner / box entrant

**Roles:** BBM, Segundo Volante, CM(A), advanced RPM.

- **Primary:** xG and xA contribution, box entries/touches, transition recoveries, possession value.
- **Process:** progressive carries/passes, off-ball arrivals, shots from high-value zones, pressures/recovery runs.
- **Exposure:** space ahead, cover behind, possessions reaching transition/final third, minutes at effective duty.
- **Attribute-output gap:** strong physical/off-ball attributes but few arrivals can mean the lane is occupied or build-up never progresses; shots with low xG may show poor arrival timing rather than low Finishing.
- **Avoid:** distance covered, goals and tackles alone.
- **Reliability:** at least 900 role-minutes and adequate box-entry/shot sample; finishing outcome needs more shots than general involvement.

### I. Advanced creator / connector

**Roles:** AP, AM(S), Enganche, Trequartista, F9 and DLF(S).

- **Primary:** open-play xA, high-value chances created, possession value, ball retention between lines.
- **Process:** key passes, passes into/within box, progressive receptions, through balls, carries drawing defenders, lay-offs.
- **Exposure:** receptions between lines, touches under pressure, runners ahead, opponent block height/density.
- **Attribute-output gap:** high Vision/Passing but low xA can mean no runners, poor reception zones or immediate pressure. Assists below xA can simply reflect teammate finishing.
- **Avoid:** assists as the principal KPI; xA only credits the pass immediately before a shot and omits valuable earlier progression. [StatsBomb, limits of xA and progression counts](https://blogarchive.statsbomb.com/articles/soccer/unpacking-ball-progression/)
- **Reliability:** creation stabilises better with passes/receptions than assists; require open-play separation.

### J. Wide creator / carrier

**Roles:** W(S/A), IW(S), wide creative portions of IW(A).

- **Primary:** open-play xA, chances created, successful box entries, possession value from carries/passes.
- **Process:** take-ons, progressive carries, wide/half-space receptions, crosses/cutbacks, passes into box.
- **Exposure:** isolation opportunities, touches in final third, overlap/underlap support, opponent double teams.
- **Attribute-output gap:** low take-on volume can mean no isolations; low cross completion may reflect target quality; high Dribbling with frequent losses can reflect excessive double-team exposure.
- **Avoid:** raw dribble completion without location/value and raw cross completion.
- **Reliability:** minimum carry and delivery counts; split flank/foot and Support/Attack duty.

### K. Wide scorer / space attacker

**Roles:** IF(S/A), Raumdeuter, IW(A), Shadow Striker.

- **Primary:** npxG/90, xG/shot, box touches/entries, goals minus xG as secondary finishing outcome.
- **Process:** shots, high-value shot share, runs/receptions behind, offensive rebounds, pressing where required.
- **Exposure:** team final-third possessions, opposite-side creation, striker gravity, width provider, opponent line.
- **Attribute-output gap:** high Finishing with low goals and low xG means insufficient/poor chance access; high xG with low goals may be finishing variance or execution; high attributes with no shots suggests a structural supply/occupation problem.
- **Avoid:** goals/90 and conversion alone. Shot volume is generally more repeatable than short-run scoring or conversion. [StatsBomb, striker metric repeatability](https://blogarchive.statsbomb.com/articles/soccer/premier-league-strikers-and-repeatability/)
- **Reliability:** use at least 900 role-minutes for involvement and a much larger rolling shot sample for finishing claims.

### L. Penalty-box striker / channel runner

**Roles:** AF, Poacher, CF(A), PF(A).

- **Primary:** npxG/90, xG/shot, shots and box touches, runs behind/channel receptions, goals minus xG secondary.
- **Process:** high-value shot acquisition, offsides (cost and evidence of line threat), carry-to-shot actions, pressing for PF.
- **Exposure:** through-ball attempts, box entries by team, quality of service, defensive line height, match state.
- **Attribute-output gap:** high Pace/Off the Ball but few chances can mean no progressive supply or compressed space; poor conversion with healthy xG requires a larger sample before blaming Finishing.
- **Avoid:** goals, conversion and shots on target % without xG and service exposure.
- **Reliability:** report Bayesian/rolling uncertainty for goals minus xG; role access can be evaluated earlier through shots, xG and runs.

### M. Linking / target striker

**Roles:** DLF(S/A), TF(S/A), CF(S), F9.

- **Primary:** possession retained from receptions, lay-offs leading to progression/chances, xA, own xG according to duty.
- **Process:** passes received under pressure, aerial contests and win %, first-contact retention, link passes, fouls won, box arrivals.
- **Exposure:** direct passes/crosses targeted at player, support distance, runners beyond, opponent CB matchup.
- **Attribute-output gap:** high Strength/Heading but low aerial wins can reflect poor delivery or mismatch; many aerial wins with no retained second ball indicates team structure failure; low assists may hide valuable lay-offs.
- **Avoid:** headers won without targets/second-ball retention; assists alone.
- **Reliability:** require sufficient targeted receptions/aerial contests and separate open play from set pieces.

## 6. Complete role-duty coverage matrix

Duty deltas use: **D** = protect/hold/safety, **S** = connect/balance, **A** = penetrate/finish/risk, **Auto** = resolve from current mentality before scoring.

| Role ID | Role and duties | Base archetype | Duty-specific primary emphasis |
|---|---|---|---|
| `gk` | GK — Defend | Goalkeeper §4.1 | shot stopping + claims + safe distribution |
| `sk` | SK — Defend / Support / Attack | Goalkeeper §4.2 | D safe sweep; S build-up/progression; A maximum sweep range and distribution value versus turnover risk |
| `cd` | CD — Defend / Stopper / Cover | A | D zone security; Stopper front-foot duel/pressure without bypass; Cover recovery actions and space-behind prevention |
| `bpd` | BPD — Defend / Stopper / Cover | A + B | same defensive deltas as CD plus progression and turnover cost |
| `ncb` | NCB — Defend / Stopper / Cover | A | clearance/duel safety; Stopper engagement; Cover recovery; no creativity requirement |
| `wcb` | WCB — Defend / Support / Attack | A + B/C | D flank cover; S progression/overlap support; A final-third entries/delivery balanced against transition exposure |
| `lib` | Libero — Defend / Support | A + B/G | D controlled midfield step and rest defence; S progression/creation and recovery to back line |
| `fb` | FB — Defend / Support / Attack / Automatic | C | D flank denial; S balanced progression/delivery; A overlap/chance creation plus recovery; Auto resolve duty |
| `wb` | WB — Defend / Support / Attack / Automatic | C | escalating width, carries, delivery and box access; defensive transition remains an explicit cost |
| `nfb` | NFB — Defend | A/C | flank duel, clearance and error avoidance; attacking output not required |
| `cwb` | CWB — Support / Attack | C | S broad creation/progression; A final-third/box occupation with high transition cost |
| `iwb` | IWB — Defend / Support / Attack | D | D rest defence; S central connection/progression; A central penetration/box support plus turnover cover |
| `ifb` | IFB — Defend | D/A | back-three formation, transition suppression and safe circulation |
| `dm` | DM — Defend / Support | E | D central protection; S protection plus progression/support availability |
| `dlp_dm` | DLP(DM) — Defend / Support | G + E | D controlled deep distribution/rest defence; S greater progression and connection |
| `bwm_dm` | BWM(DM) — Defend / Support | F + E | D regain while protecting zone; S broader press/support and transition progression |
| `anchor` | Anchor — Defend | E | space denial, central transition control, low-risk retention |
| `half_back` | Half Back — Defend | E/A | drop/build-up line formation, CB/full-back cover, safe circulation |
| `regista` | Regista — Support | G | high-volume progression/creation from depth versus turnover and transition exposure |
| `roaming_playmaker_dm` | RPM(DM) — Support | G + H | progression across zones, carries, creation, recovery availability |
| `segundo_volante` | Segundo Volante — Support / Attack | H | S timed two-way arrivals; A box entries/xG while maintaining transition recovery evidence |
| `cm` | CM — Defend / Support / Attack / Automatic | E/G/H | D protect; S connect/two-way; A box entry and creation; Auto resolve duty |
| `dlp_cm` | DLP(CM) — Defend / Support | G + E | D hold/protect while distributing; S more connection/progression |
| `bbm` | BBM — Support | H | two-way progression, box arrival, pressure/recovery repeatability |
| `bwm_cm` | BWM(CM) — Defend / Support | F | D zone-aware regains; S broader pressure and support progression |
| `ap_cm` | AP(CM) — Support / Attack | I | S progression and chance creation; A higher box access, final actions and turnover risk |
| `mezzala` | Mezzala — Support / Attack | I/H | S half-space connection/creation; A penetration, box entries, shots/xG |
| `carrilero` | Carrilero — Support | E | lateral cover, safe flank connection, transition protection |
| `am_amc` | AM — Support / Attack | I/H | S connection + creation; A box entries, xG and final actions |
| `ap_amc` | AP(AMC) — Support / Attack | I | S between-line creation; A more penetration, shots/box actions while retaining creator KPIs |
| `shadow_striker` | Shadow Striker — Attack | K + F | xG/box arrivals plus high-zone pressure/regains |
| `enganche` | Enganche — Support | I | stationary between-line availability and creation; low press volume is role-consistent |
| `trequartista_amc` | Trequartista — Attack | I + K | creation and scoring value; defensive output is intentionally low but team cost must be visible |
| `winger` | Winger — Support / Attack | J | S width + delivery + connection; A carries behind, high-value delivery and box threat |
| `inverted_winger` | IW — Support / Attack | J/K | S half-space creation; A greater shots/xG/box access alongside creation |
| `inside_forward` | IF — Support / Attack | K | S scoring threat plus combinations; A npxG, box occupation and runs behind |
| `raumdeuter` | Raumdeuter — Attack | K | space arrival, high-quality shots, blind-side box access; low ball involvement can be role-consistent |
| `af` | Advanced Forward — Attack | L | line stretching, channel access, npxG and high-value shooting |
| `dlf` | DLF — Support / Attack | M/I | S link/creation and retention; A retains link duty but adds box entries/xG |
| `target_forward` | Target Forward — Support / Attack | M | S first-contact retention and runners supplied; A aerial/box shot threat plus link value |
| `poacher` | Poacher — Attack | L | box access, npxG, xG/shot and line timing; low creation/defending is role-consistent |
| `complete_forward` | Complete Forward — Support / Attack | M/L/I | S complete link/creation/carrying; A adds dominant npxG and box threat |
| `pressing_forward` | Pressing Forward — Defend / Support / Attack | F + M/L | D disruption and forced direct play; S regain + linking; A regain + channel/shot threat |
| `false_nine` | False Nine — Support | I/M | between-line receptions, progression/creation, defenders displaced and runners enabled |

## 7. Cross-role diagnostic rules

These rules should run before any verdict such as “underperforming role.”

### 7.1 Attribute–process–outcome decomposition

```text
High attributes + low process opportunity
  => tactical access/supply diagnosis

High attributes + adequate opportunity + good process + low outcome
  => outcome variance or downstream teammate effect

High attributes + adequate opportunity + weak process
  => possible role familiarity, decision, trait, fatigue, opposition or model mismatch

Low attributes + strong output in small sample
  => do not upgrade capacity; flag possible variance/context advantage
```

### 7.2 Exposure denominators by function

Never use only `/90` when the opportunity is more specific:

| Function | Preferred denominator |
|---|---|
| GK shot stopping | shots on target faced; PSxG faced |
| Cross claiming | claimable crosses/high balls |
| Defender duels | opponent entries/duels in responsible zone |
| Tackling/pressing | opponent possessions or pass opportunities in zone |
| Crossing | wide-final-third receptions or delivery opportunities |
| Playmaking | receptions/touches in relevant build-up or between-line zone |
| Finishing | touches/receptions in box and shots; xG opportunity |
| Target play | passes targeted and aerial/ground contests received |
| Sweeping | opponent through balls/loose balls behind line |

### 7.3 Tactical context fields required

- formation, role, duty and effective mentality for each match segment;
- team possession and territory/Field Tilt;
- defensive line, press intensity/PPDA and block height;
- teammate roles on the same side and nearest line;
- opponent strength, shape and block/press;
- game state (leading/drawing/trailing), red cards and minutes played;
- set-piece versus open-play separation;
- home/away only as context, not a causal explanation.

## 8. Misleading metrics blacklist

- **Average rating:** composite and opaque; useful as a symptom, never a role KPI.
- **Goals/assists:** sparse outcomes affected by teammate execution and variance.
- **Clean sheets/goals conceded:** primarily team outcomes.
- **Saves/90:** workload, not isolated shot-stopping quality.
- **Pass completion:** conflates pass difficulty, direction, pressure and value.
- **Tackles/interceptions/clearances:** strongly opportunity- and system-dependent.
- **Cross/dribble completion:** says little about location, value or downstream outcome.
- **Distance covered/sprints:** workload without tactical correctness.
- **Possession won/lost:** needs zone, pressure, risk and subsequent value.
- **One-match heatmaps:** descriptive snapshots with high contextual variance.

## 9. Minimum sample and reliability gates

There is no universal magic minutes threshold. Reliability should depend on event counts and tactical stability.

Minutes played are mandatory evidence, but must not be added as a simple linear bonus to a performance score. A linear bonus would make availability dominate quality and could permanently favour an inferior high-minute player. Instead, minutes control how strongly the model trusts the observed statistics.

Use **role-minutes**, not unrestricted season minutes. A player's minutes as Winger (Attack) are not evidence for performance as Inside Forward (Support). Split the sample whenever position, role or duty changes materially; retain formation, mentality and tactical context as segment tags.

### 9.1 Reliability adjustment

For every metric, store both the raw observation and a reliability-adjusted estimate:

```text
reliability = effective_sample / (effective_sample + stabilization_constant)

adjusted_performance =
  reliability * observed_performance
  + (1 - reliability) * comparison_baseline
```

- `effective_sample` should be relevant opportunities when the metric has a direct event denominator; otherwise use role-minutes as a proxy.
- `stabilization_constant` must be calibrated separately for each metric from historical data. It is not one universal minutes threshold.
- `comparison_baseline` must come from an appropriate cohort, such as the same position/role family and competition level. It must be shown to the user.
- a small sample is pulled strongly toward the baseline; a large sample is allowed to represent the player's observed level more fully;
- raw and adjusted values must both remain visible. The adjustment expresses uncertainty, not an attempt to rewrite the match record.

Consequently, a perfect save percentage from 180 role-minutes and eight shots on target faced should not automatically outrank a good save percentage sustained across 1,800 role-minutes and 90 shots on target faced. The former retains a high raw result but low reliability; the latter supplies much stronger evidence. Comparative ranking should use the adjusted estimate and an uncertainty penalty or interval, never the raw percentage alone.

### 9.2 Evidence hierarchy

Use the most specific valid sample for each judgement:

1. relevant opportunities for the metric;
2. role-minutes for the exact position–role–duty;
3. number and distribution of appearances or match segments;
4. stability across comparable rolling windows;
5. total minutes only as availability context, never as a substitute for role-minutes.

Two players with equal role-minutes can still have different reliability. For example, a goalkeeper who faced 80 shots on target provides more shot-stopping evidence than one who faced 25, while a winger with many minutes but few wide-final-third receptions provides weak evidence about crossing execution because the tactic rarely gave him the opportunity.

### 9.3 Initial display gates

Recommended initial gates for the builder (product hypotheses, not claims about the FM engine):

| Level | Gate | Permitted output |
|---|---|---|
| Insufficient | `<270` role-minutes or `<10` relevant opportunities | observations only; no performance band |
| Low | `270–899` role-minutes or sparse role events | provisional tendencies with strong warning |
| Usable | `900–1799` role-minutes plus adequate event counts | contextual role diagnosis |
| Strong | `1800+` role-minutes, adequate events, stable role/context | comparative performance assessment |

Override minutes with event gates: goalkeeper shot stopping needs a large shots-on-target sample; aerial assessment needs contests; creators need relevant receptions/passes; finishers need shots/xG. Small samples must show uncertainty intervals. A handful of matches can support a tactical hypothesis but not a stable player-quality conclusion.

The gates determine which claims the UI may make; they are not score multipliers. Thresholds must later be calibrated per metric and competition using validation data.

### 9.4 Stability and context safeguards

- distribute evidence across matches; one exceptional match must not look equivalent to the same output repeated over many matches;
- show rolling-window stability only across comparable role and tactical segments;
- tag substitute minutes, starts, game state and red-card states so unusual match states can be inspected;
- do not punish a player merely for lacking opportunities created by the tactic;
- do not reward minutes alone: availability is a separate axis from role execution;
- when samples remain sparse, return `insufficient evidence` rather than a confident negative or positive verdict.

## 10. Proposed matrix output

The robust matrix should not blend everything into one unexplained score:

```text
Role: Goalkeeper — Defend
Attribute capacity:     82 / 100 (high)
Role-minutes:           1,260 across 15 starts + 3 substitute segments
Relevant opportunities: 64 shots on target faced
Process execution:     raw 68 / adjusted 65 (usable sample)
Outcome performance:   raw 54 / adjusted 59 (medium reliability)
Opportunity/exposure:  high — 5.8 SOT faced/90, high PSxG/shot
Tactical fit signal:   defence exposes close central shots and 1v1s
Diagnostic confidence: medium

Conclusion:
Observed save rate is below expectation, but the goalkeeper faces an unusually
difficult shot mix. Do not infer an attribute failure until PSxG-based shot
stopping and a larger sample confirm it.
```

The eventual score must retain separate axes:

- **capacity** — attributes and traits;
- **access** — whether the tactic supplies the role's actions;
- **execution** — process success conditional on opportunity;
- **outcome** — end product conditional on process;
- **fit** — whether role behaviour helps the team objective;
- **availability** — total minutes and match availability, kept separate from quality;
- **reliability** — whether role-minutes, relevant opportunities and stability are sufficient.

Every metric shown in the matrix must expose its raw value, adjusted value, denominator, role-minutes and reliability label. The UI must explain why a high raw statistic can receive a cautious assessment when its sample is small.

## 11. Implementation prerequisites

Before coding formulas:

1. inventory the exact FM24 fields that the user can enter/export and map their display names;
2. preserve provider definitions and version them;
3. add match-segment role/duty tagging rather than season totals only;
4. implement exposure denominators before performance bands;
5. start with GK(D), one last-line defender, one wing-back, one controller, one creator and one striker;
6. validate diagnoses against match video/event examples;
7. only then expand through the complete coverage matrix.

This catalogue deliberately defines evidence and diagnosis, not fixed weights. Weighting role KPIs before confirming data availability and opportunity denominators would recreate the same false certainty as an attribute-only score.
