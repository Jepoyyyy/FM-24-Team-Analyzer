import { Player, Position, TacticSlot, TeamInstructions } from '../../types';
import { ALL_ROLES } from '../roles';
import { getMentalityProfile } from './mentality';
import { getRoleDutyProfile, ROLE_DUTY_PROFILES } from './roleDutyProfiles';
import { ALL_ROLE_MATRIX_DEFINITIONS, ImportedMetricRule } from './tacticPlayerMatrix';

/** Versioned, pure Player Lab model. Values are 0..100; unknown evidence is never imputed. */
export const PLAYER_LAB_MODEL_VERSION = 'player-lab-1.2.0';
export const EXPERIMENTAL_POLICY_VERSION = 'family-transfer-1.0.0';
export const EXPERIMENTAL_THRESHOLDS = { attributeCoverage: 0.6, attributeCapacity: 45, metricCoverage: 0.34, familiarityPenalty: 12 } as const;
export type RadarAxis = 'defensiveSecurity' | 'ballProgression' | 'chanceCreation' | 'penetrationScoring' | 'widthDelivery' | 'physicalCoverage';
export const RADAR_AXES: RadarAxis[] = ['defensiveSecurity', 'ballProgression', 'chanceCreation', 'penetrationScoring', 'widthDelivery', 'physicalCoverage'];
export interface LedgerEntry { id: string; label: string; value: number; kind: 'base' | 'adjustment' | 'risk'; evidence: string; }
export interface AttributeContributionEvidence { id: string; observed: number | null; normalized: number | null; importance: 'key' | 'desirable'; demandWeight: number; contribution: number; missing: boolean; note?: string; }
export interface MetricContributionEvidence { id: string; label: string; observed: number | null; baseline: number; normalized: number | null; adjusted: number | null; reliability: number; importance: number; contribution: number; missing: boolean; proxyNote?: string; }
/** Per-axis proof that the active tactic, rather than a hidden modifier, changed fit. */
export interface DemandContributionEvidence { axis: RadarAxis; player: number | null; demand: number; compatibility: number | null; contribution: number; missing: boolean; }
export interface SlotDemand { slotId: string; roleDutyKey: string; attributes: string[]; metrics: ImportedMetricRule[]; behaviorDemand: Record<RadarAxis, number>; evidenceConfidence: 'high' | 'medium' | 'low'; explanation: string[]; }
export interface PerformanceEvidence { raw: number | null; adjusted: number | null; baseline: number | null; reliability: number; metricCoverage: number; minutes: number | null; minutesKind: 'role_minutes' | 'total_minutes_proxy' | 'missing'; missingMetrics: string[]; contributions: MetricContributionEvidence[]; }
export interface SlotEvaluation { slotId: string; roleLabel: string; fit: number; attributeCapacity: number | null; attributeCoverage: number; attributeEvidence: AttributeContributionEvidence[]; performance: PerformanceEvidence; familiarity: string; candidateType: 'natural' | 'experimental'; familiarityRisk: number; ledger: LedgerEntry[]; radar: Record<RadarAxis, number | null>; axisConfidence: Record<RadarAxis, number>; demand: SlotDemand; demandEvidence: DemandContributionEvidence[]; compensationNotes: string[]; }
export interface PlayerLabRow { playerId: string; playerName: string; candidateType: 'natural' | 'experimental'; formationFit: number; bestSlot: SlotEvaluation | null; alternatives: SlotEvaluation[]; radar: { player: Record<RadarAxis, number | null>; cohortMedian: Record<RadarAxis, number | null>; demand: Record<RadarAxis, number>; confidence: Record<RadarAxis, number> }; }
export interface PlayerLabResult { modelVersion: string; natural: PlayerLabRow[]; experimental: PlayerLabRow[]; demands: SlotDemand[]; }

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const round = (v: number) => Math.round(v * 100) / 100;
const mirror: Partial<Record<Position, Position>> = { DR: 'DL', DL: 'DR', WBR: 'WBL', WBL: 'WBR', MR: 'ML', ML: 'MR', AMR: 'AML', AML: 'AMR' };
const attribute = (player: Player, id: string) => {
  const direct = player.attributes[id];
  if (typeof direct === 'number') return direct;
  return Object.entries(player.attributes).find(([key, value]) => key.toLowerCase() === id.toLowerCase() && typeof value === 'number')?.[1];
};
const norm = (v: number) => clamp(((v - 1) / 19) * 100);
const sortRows = (a: PlayerLabRow, b: PlayerLabRow) => b.formationFit - a.formationFit || a.playerName.localeCompare(b.playerName) || a.playerId.localeCompare(b.playerId);

/** The explicit/inferred role profiles plus matrix definitions are the completeness contract for all 85 combinations. */
export function playerLabDefinitionGaps(): string[] {
  return ALL_ROLES.flatMap(role => role.availableDuties.flatMap(duty => {
    const profile = getRoleDutyProfile(role.id, duty);
    const matrix = ALL_ROLE_MATRIX_DEFINITIONS.find(item => item.roleId === role.id && item.duty === duty);
    return !profile || !matrix || !matrix.metrics.length || !profile.description ? [`${role.id}:${duty}`] : [];
  }));
}

function behaviorDemand(slot: TacticSlot, instructions: TeamInstructions): Record<RadarAxis, number> {
  const profile = getRoleDutyProfile(slot.roleId, slot.duty)!;
  const mentality = getMentalityProfile(instructions.mentality).modifiers;
  const pis = new Set(slot.customPIs);
  const pressing = instructions.pressingIntensity === 'much_more_often' ? 14 : instructions.pressingIntensity === 'more_often' ? 8 : instructions.pressingIntensity === 'less_often' ? -8 : 0;
  const highLine = instructions.defensiveLine.includes('higher') ? 7 : instructions.defensiveLine.includes('lower') ? -5 : 0;
  const wide = instructions.attackingWidth.includes('wide') || profile.movement.width === 'stay_wider' ? 12 : profile.movement.width === 'sit_narrower' ? -5 : 0;
  const attacking = slot.duty === 'Attack' ? 14 : slot.duty === 'Support' ? 6 : -4;
  return {
    defensiveSecurity: clamp(50 + (profile.defensive.screening === 'high' ? 18 : 0) + (profile.defensive.aerialCover ? 7 : 0) + pressing + highLine + (instructions.whenLostPossession === 'counter_press' ? 5 : instructions.whenLostPossession === 'regroup' ? -5 : 0) + (pis.has('mark_tighter') ? 6 : 0) + (pis.has('close_down_more') ? 6 : pis.has('close_down_less') ? -6 : 0)),
    ballProgression: clamp(45 + (profile.possession.progressionRole === 'progressor' || profile.possession.progressionRole === 'build_up_outlet' ? 22 : 5) + mentality.forwardRuns / 3 + (instructions.passingDirectness.includes('direct') || instructions.passIntoSpace ? 7 : instructions.passingDirectness.includes('shorter') ? -4 : 0) + (pis.has('take_more_risks') ? 7 : pis.has('fewer_risky_passes') ? -7 : 0)),
    chanceCreation: clamp(40 + (profile.possession.progressionRole === 'final_ball_creator' ? 30 : 6) + mentality.boxCommitment / 2 + (instructions.creativeFreedom === 'more_expressive' ? 8 : instructions.creativeFreedom === 'more_disciplined' ? -5 : 0) + (pis.has('take_more_risks') ? 6 : 0)),
    penetrationScoring: clamp(38 + attacking + (profile.movement.boxRuns === 'primary_target' ? 25 : profile.movement.boxRuns === 'frequent' ? 12 : 0) + mentality.forwardRuns + (instructions.passIntoSpace || instructions.whenWonPossession === 'counter' ? 7 : 0) + (pis.has('get_further_forward') ? 8 : pis.has('hold_position') || pis.has('drop_deeper') ? -8 : 0) + (pis.has('shoot_more_often') ? 5 : pis.has('shoot_less_often') ? -5 : 0)),
    widthDelivery: clamp(35 + wide + (profile.possession.crossing === 'cross_less' ? -10 : 14) + (instructions.earlyCrosses ? 7 : 0) + (instructions.overlapLeft || instructions.overlapRight ? 5 : 0) + (pis.has('stay_wider') || pis.has('run_wide_with_ball') ? 8 : pis.has('sit_narrower') || pis.has('cut_inside_with_ball') ? -8 : 0) + (pis.has('cross_more_often') ? 6 : pis.has('cross_less_often') ? -6 : 0)),
    physicalCoverage: clamp(48 + (profile.defensive.recoveryTrackback === 'high' ? 15 : 0) + pressing + mentality.fatigueRisk / 2 + (instructions.tempo.includes('higher') ? 5 : instructions.tempo.includes('lower') ? -4 : 0) + (pis.has('close_down_more') ? 5 : pis.has('close_down_less') ? -5 : 0)),
  };
}

export function deriveSlotDemand(slot: TacticSlot, instructions: TeamInstructions): SlotDemand | null {
  const profile = getRoleDutyProfile(slot.roleId, slot.duty);
  const matrix = ALL_ROLE_MATRIX_DEFINITIONS.find(item => item.roleId === slot.roleId && item.duty === slot.duty);
  if (!profile || !matrix) return null;
  const demand = behaviorDemand(slot, instructions);
  const tiNotes = [`mentality:${instructions.mentality}`, `pressing:${instructions.pressingIntensity}`, `line:${instructions.defensiveLine}`];
  if (slot.customPIs.length) tiNotes.push(`custom PIs:${slot.customPIs.join(',')}`);
  return { slotId: slot.slotId, roleDutyKey: `${slot.roleId}:${slot.duty}`, attributes: [...new Set([...profile.keyAttributes, ...profile.desirableAttributes])], metrics: matrix.metrics, behaviorDemand: demand, evidenceConfidence: profile.evidence?.confidence ?? 'medium', explanation: [profile.description, ...tiNotes] };
}

function metricScore(value: number, rule: ImportedMetricRule) { const p = rule.direction === 'higher' ? (value - rule.baseline) / (rule.strong - rule.baseline || 1) : (rule.baseline - value) / (rule.baseline - rule.strong || 1); return clamp(50 + p * 25); }
function performance(player: Player, demand: SlotDemand): PerformanceEvidence {
  const available = demand.metrics.flatMap(rule => typeof player.performance?.metrics[rule.id] === 'number' ? [{ rule, value: player.performance!.metrics[rule.id] }] : []);
  const weight = available.reduce((sum, item) => sum + item.rule.weight, 0);
  const raw = weight ? available.reduce((sum, item) => sum + metricScore(item.value, item.rule) * item.rule.weight, 0) / weight : null;
  const minutes = player.performance?.minutesPlayed ?? null;
  const isProxy = player.performance?.minutesKind === 'total_minutes_proxy';
  const minuteReliability = minutes === null ? 0 : minutes / (minutes + 900);
  // Export lacks exact role opportunities; count observed relevant metric fields as a transparent capped proxy.
  const proxyReliability = available.length / Math.max(1, demand.metrics.length);
  const reliability = raw === null ? 0 : Math.min(isProxy ? 0.55 : 1, Math.sqrt(minuteReliability * proxyReliability));
  const baseline = weight ? available.reduce((sum, item) => sum + 50 * item.rule.weight, 0) / weight : null;
  const adjusted = raw === null ? null : reliability * raw + (1 - reliability) * (baseline ?? 50);
  const contributions = demand.metrics.map(rule => {
    const observed = player.performance?.metrics[rule.id]; const known = typeof observed === 'number';
    const normalized = known ? metricScore(observed, rule) : null;
    return { id: rule.id, label: rule.label, observed: known ? observed : null, baseline: rule.baseline, normalized: normalized === null ? null : round(normalized), adjusted: normalized === null ? null : round(reliability * normalized + (1 - reliability) * 50), reliability: round(reliability), importance: rule.weight, contribution: normalized === null || !weight ? 0 : round((reliability * normalized + (1 - reliability) * 50) * (rule.weight / weight) * .3), missing: !known, proxyNote: isProxy ? 'Total exported minutes are a capped reliability proxy, not role-specific minutes.' : undefined };
  });
  return { raw: raw === null ? null : round(raw), adjusted: adjusted === null ? null : round(adjusted), baseline, reliability: round(reliability), metricCoverage: demand.metrics.length ? available.length / demand.metrics.length : 0, minutes, minutesKind: player.performance?.minutesKind ?? 'missing', missingMetrics: demand.metrics.filter(rule => !available.some(item => item.rule.id === rule.id)).map(rule => rule.label), contributions };
}

function family(position: Position): string { if (position === 'GK') return 'gk'; if (['DC'].includes(position)) return 'central-defence'; if (['DR','DL','WBR','WBL'].includes(position)) return 'wide-defence'; if (['DM','MC'].includes(position)) return 'central-midfield'; if (['MR','ML','AMR','AML'].includes(position)) return 'wide-attack'; return 'central-attack'; }
/** Explicit allowed transfers: same family only, plus adjacent wide/central midfield and wing-back/wide attack. */
export function isPlausibleExperimentalTransfer(from: Position, to: Position): boolean { const a = family(from); const b = family(to); return a === b || (a === 'wide-defence' && b === 'wide-attack') || (a === 'wide-attack' && b === 'wide-defence') || (a === 'central-midfield' && b === 'central-attack') || (a === 'central-attack' && b === 'central-midfield'); }
function radar(player: Player): { values: Record<RadarAxis, number | null>; confidence: Record<RadarAxis, number> } {
  const groups: Record<RadarAxis, string[]> = { defensiveSecurity: ['tackling','marking','positioning','anticipation','heading'], ballProgression: ['passing','vision','technique','firstTouch','composure'], chanceCreation: ['vision','passing','decisions','technique','flair'], penetrationScoring: ['finishing','composure','offTheBall','acceleration','dribbling'], widthDelivery: ['crossing','dribbling','pace','acceleration','technique'], physicalCoverage: ['stamina','workRate','pace','acceleration','strength'] };
  const values = {} as Record<RadarAxis, number | null>; const confidence = {} as Record<RadarAxis, number>;
  for (const axis of RADAR_AXES) { const known = groups[axis].flatMap(id => { const v = attribute(player,id); return v === undefined ? [] : [norm(v)]; }); values[axis] = known.length ? round(known.reduce((a,b)=>a+b,0)/known.length) : null; confidence[axis] = known.length / groups[axis].length; }
  return { values, confidence };
}

function evaluate(player: Player, slot: TacticSlot, demand: SlotDemand): SlotEvaluation | null {
  const exact = player.positions.find(p => p.position === slot.position) ?? player.positions.find(p => mirror[p.position] === slot.position);
  const experimentalFrom = !exact ? player.positions.find(p => isPlausibleExperimentalTransfer(p.position, slot.position)) : undefined;
  if (!exact && !experimentalFrom) return null;
  const attributes = demand.attributes.map(id => ({ id, value: attribute(player,id), weight: getRoleDutyProfile(slot.roleId,slot.duty)!.keyAttributes.includes(id) ? 2 : 1 }));
  const known = attributes.filter((item): item is typeof item & { value: number } => item.value !== undefined);
  const totalWeight = attributes.reduce((s,x)=>s+x.weight,0); const knownWeight=known.reduce((s,x)=>s+x.weight,0);
  const capacity = knownWeight ? known.reduce((s,x)=>s+norm(x.value)*x.weight,0)/knownWeight : null; const coverage=totalWeight?knownWeight/totalWeight:0;
  const perf = performance(player,demand); const candidateType = exact ? 'natural' : 'experimental';
  if (candidateType === 'experimental' && (coverage < EXPERIMENTAL_THRESHOLDS.attributeCoverage || (capacity ?? 0) < EXPERIMENTAL_THRESHOLDS.attributeCapacity || perf.metricCoverage < EXPERIMENTAL_THRESHOLDS.metricCoverage)) return null;
  const familiarity = (exact ?? experimentalFrom)!.familiarity; const familiarityRisk = candidateType === 'experimental' ? EXPERIMENTAL_THRESHOLDS.familiarityPenalty : familiarity === 'Natural' ? 0 : familiarity === 'Accomplished' ? 4 : 9;
  const attributeEvidence: AttributeContributionEvidence[] = attributes.map(item => ({ id: item.id, observed: item.value ?? null, normalized: item.value === undefined ? null : round(norm(item.value)), importance: item.weight === 2 ? 'key' : 'desirable', demandWeight: item.weight, contribution: item.value === undefined || !knownWeight ? 0 : round(norm(item.value) * (item.weight / knownWeight) * .7), missing: item.value === undefined, note: item.value === undefined ? 'Unknown is excluded from capacity and separately penalised; it is not treated as zero.' : undefined }));
  const ledger: LedgerEntry[] = [];
  if (capacity !== null) ledger.push({ id:'attributes', label:'Missing-aware attribute capacity', value: capacity * .7, kind:'base', evidence:`${Math.round(coverage*100)}% weighted coverage` });
  if (perf.adjusted !== null) ledger.push({ id:'performance', label:'Reliability-adjusted performance', value: perf.adjusted * .3, kind:'base', evidence:`${perf.minutes ?? 0} ${perf.minutesKind}; reliability ${perf.reliability}` });
  const r = radar(player);
  const demandAxes = RADAR_AXES.filter(axis => r.values[axis] !== null);
  const demandEvidence: DemandContributionEvidence[] = RADAR_AXES.map(axis => {
    const playerAxis = r.values[axis];
    const compatibility = playerAxis === null ? null : 100 - Math.abs(playerAxis - demand.behaviorDemand[axis]);
    return {
      axis,
      player: playerAxis,
      demand: demand.behaviorDemand[axis],
      compatibility: compatibility === null ? null : round(compatibility),
      // The six visible rows reconcile exactly to the 10-point tactic-demand ledger.
      contribution: compatibility === null || !demandAxes.length ? 0 : round((compatibility / demandAxes.length) * .1),
      missing: playerAxis === null,
    };
  });
  const demandContribution = demandEvidence.reduce((sum, item) => sum + item.contribution, 0);
  if (demandAxes.length) ledger.push({ id: 'tactic-demand', label: 'Active mentality, team-instruction & PI demand match', value: demandContribution, kind: 'adjustment', evidence: `Six-axis compatibility ${round(demandContribution * 10)}/100; demand reflects active mentality, TIs and custom PIs.` });
  const missingPenalty = (1-coverage)*8; if (missingPenalty) ledger.push({ id:'missing', label:'Unknown attribute evidence', value:-missingPenalty,kind:'risk',evidence:'missing remains unknown'});
  if (familiarityRisk) ledger.push({id:'familiarity',label:'Familiarity / experimental risk',value:-familiarityRisk,kind:'risk',evidence:candidateType});
  const compensationNotes = [
    ...attributeEvidence.filter(item => item.missing).map(item => `Verify ${item.id} before committing this role; a supporting teammate cannot replace unknown evidence.`),
    ...RADAR_AXES.filter(axis => r.values[axis] !== null && (r.values[axis] ?? 100) + 12 < demand.behaviorDemand[axis]).map(axis => `Support ${axis} with a complementary teammate or reduce the related active instruction demand.`),
    ...(perf.minutesKind === 'total_minutes_proxy' ? ['Treat performance reliability as a capped total-minutes proxy; confirm role-specific minutes before a high-stakes decision.'] : []),
  ];
  const score = clamp(ledger.reduce((sum,x)=>sum+x.value,0));
  return { slotId:slot.slotId, roleLabel:`${slot.position} · ${slot.roleId} (${slot.duty})`, fit:round(score), attributeCapacity:capacity===null?null:round(capacity), attributeCoverage:coverage, attributeEvidence, performance:perf, familiarity, candidateType, familiarityRisk, ledger, radar:r.values, axisConfidence:r.confidence, demand, demandEvidence, compensationNotes };
}

function median(values: Array<number | null>): number | null { const known=values.filter((v):v is number=>v!==null).sort((a,b)=>a-b); if(!known.length)return null; const m=Math.floor(known.length/2);return round(known.length%2?known[m]:(known[m-1]+known[m])/2); }
export function reconcileSlotFit(slot: SlotEvaluation): number { return round(clamp(slot.ledger.reduce((sum,item)=>sum+item.value,0))); }
export function evaluatePlayerLab(players: Player[], slots: TacticSlot[], instructions: TeamInstructions): PlayerLabResult {
  const demands=slots.flatMap(slot=>{const d=deriveSlotDemand(slot,instructions);return d?[d]:[]});
  const rows=players.flatMap(player=>{
    const evaluations=slots.flatMap(slot=>{const d=demands.find(x=>x.slotId===slot.slotId);const value=d?evaluate(player,slot,d):null;return value?[value]:[]}).sort((a,b)=>b.fit-a.fit||a.slotId.localeCompare(b.slotId));
    // One best row per player in each collection; alternatives belong to that
    // same candidate type so opting out never leaks experimental suggestions.
    return (['natural', 'experimental'] as const).flatMap(candidateType=>{
      const candidates=evaluations.filter(value=>value.candidateType===candidateType);
      const best=candidates[0];
      if(!best)return [];
      return [{playerId:player.id,playerName:player.name,candidateType,formationFit:best.fit,bestSlot:best,alternatives:candidates.slice(1),radar:{player:best.radar,cohortMedian:{} as Record<RadarAxis,number|null>,demand:best.demand.behaviorDemand,confidence:best.axisConfidence}}];
    });
  });
  const natural=rows.filter(row=>row.candidateType==='natural'); for(const row of rows){ for(const axis of RADAR_AXES) row.radar.cohortMedian[axis]=median(natural.filter(other=>other.bestSlot?.slotId===row.bestSlot?.slotId).map(other=>other.radar.player[axis])); }
  return {modelVersion:PLAYER_LAB_MODEL_VERSION,natural:natural.sort(sortRows),experimental:rows.filter(row=>row.candidateType==='experimental').sort(sortRows),demands};
}

export type PlayerLabSortKey = 'formationFit' | 'name' | 'attributeCapacity' | 'adjustedPerformance' | 'reliability' | 'candidateType';
export function sortPlayerLabRows(rows: PlayerLabRow[], key: PlayerLabSortKey = 'formationFit', direction: 'asc'|'desc' = 'desc'): PlayerLabRow[] { const sign=direction==='asc'?1:-1; const value=(r:PlayerLabRow):string|number=>key==='name'?r.playerName:key==='formationFit'?r.formationFit:key==='candidateType'?r.candidateType:key==='attributeCapacity'?r.bestSlot?.attributeCapacity??-1:key==='adjustedPerformance'?r.bestSlot?.performance.adjusted??-1:r.bestSlot?.performance.reliability??-1; return [...rows].sort((a,b)=>{const x=value(a),y=value(b);const d=typeof x==='string'&&typeof y==='string'?x.localeCompare(y):(x as number)-(y as number);return d*sign||a.playerName.localeCompare(b.playerName)||a.playerId.localeCompare(b.playerId);}); }

// Forces a direct, import-time coverage check without hiding inferred profiles.
export const PLAYER_LAB_ROLE_DUTY_COUNT = ROLE_DUTY_PROFILES.length;
