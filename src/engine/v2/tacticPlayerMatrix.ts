import { Duty, Player, Position, TacticSlot } from '../../types';
import { ALL_ROLES } from '../roles';

export interface ImportedMetricRule { id: string; label: string; baseline: number; strong: number; direction: 'higher' | 'lower'; weight: number }
export interface RoleMatrixDefinition { key: string; roleId: string; roleName: string; duty: Duty; positions: Position[]; keyAttributes: string[]; desirableAttributes: string[]; metrics: ImportedMetricRule[] }
export interface TacticPlayerCandidate {
  slotId: string; playerId: string; playerName: string; roleLabel: string; position: Position;
  familiarity: string; attributeCapacity: number | null; attributeCoverage: number;
  minutes: number | null; minutesKind: 'role_minutes' | 'total_minutes_proxy' | 'missing';
  rawPerformance: number | null; adjustedPerformance: number | null; reliability: number;
  metricCoverage: number; evidenceScore: number | null; missingMetrics: string[];
}

const metric = (id: string, label: string, baseline: number, strong: number, weight: number, direction: 'higher' | 'lower' = 'higher'): ImportedMetricRule => ({ id, label, baseline, strong, weight, direction });
const SETS: Record<string, ImportedMetricRule[]> = {
  goalkeeper: [metric('savePct', 'Save %', 70, 80, .45), metric('goalsPrevented', 'Goals prevented', 0, 5, .3), metric('crossesStoppedPct', 'Crosses stopped %', 6, 12, .25)],
  defender: [metric('tackleWinPct', 'Tackles won %', 68, 82, .35), metric('interceptionsP90', 'Interceptions / 90', 1.1, 2.2, .3), metric('aerialWinPct', 'Headers won %', 60, 76, .35)],
  progressor: [metric('passCompletionPct', 'Pass completion %', 82, 91, .3), metric('progressivePassesP90', 'Progressive passes / 90', 4, 8, .4), metric('possessionLostP90', 'Possession lost / 90', 12, 7, .3, 'lower')],
  wide: [metric('crossesCompletedP90', 'Crosses completed / 90', 1, 2.5, .35), metric('dribblesP90', 'Dribbles / 90', 1.5, 3.5, .3), metric('tackleWinPct', 'Tackles won %', 65, 78, .35)],
  ballwinner: [metric('tackleWinPct', 'Tackles won %', 68, 82, .35), metric('possessionWonP90', 'Possession won / 90', 7, 11, .4), metric('interceptionsP90', 'Interceptions / 90', 1, 2.2, .25)],
  creator: [metric('keyPassesP90', 'Key passes / 90', 1.2, 2.7, .35), metric('xAP90', 'xA / 90', .12, .32, .35), metric('progressivePassesP90', 'Progressive passes / 90', 4, 8, .3)],
  runner: [metric('progressiveCarriesP90', 'Progressive carries / 90', 2, 5, .35), metric('dribblesP90', 'Dribbles / 90', 1.5, 4, .3), metric('possessionWonP90', 'Possession won / 90', 5, 9, .35)],
  scorer: [metric('xgP90', 'xG / 90', .25, .65, .4), metric('goalsP90', 'Goals / 90', .25, .65, .35), metric('shotsOnTargetPct', 'Shots on target %', 38, 55, .25)],
  target: [metric('aerialWinPct', 'Headers won %', 48, 68, .35), metric('xgP90', 'xG / 90', .25, .55, .35), metric('assistsP90', 'Assists / 90', .08, .25, .3)],
};

const ROLE_SET: Record<string, string[]> = {
  gk: ['goalkeeper'], sk: ['goalkeeper', 'progressor'], cd: ['defender'], ncb: ['defender'], bpd: ['defender', 'progressor'], wcb: ['defender', 'wide'], lib: ['defender', 'progressor'],
  fb: ['defender', 'wide'], wb: ['wide'], nfb: ['defender'], cwb: ['wide', 'runner'], iwb: ['progressor', 'ballwinner'], ifb: ['defender', 'progressor'],
  dm: ['ballwinner', 'progressor'], dlp_dm: ['progressor'], bwm_dm: ['ballwinner'], anchor: ['ballwinner'], half_back: ['defender', 'progressor'], regista: ['creator', 'progressor'], roaming_playmaker_dm: ['creator', 'runner'], segundo_volante: ['runner', 'scorer'],
  cm: ['progressor', 'ballwinner'], dlp_cm: ['progressor'], bbm: ['runner', 'ballwinner'], bwm_cm: ['ballwinner'], ap_cm: ['creator'], mezzala: ['creator', 'runner'], carrilero: ['progressor', 'ballwinner'],
  am_amc: ['creator', 'scorer'], ap_amc: ['creator'], shadow_striker: ['scorer', 'runner'], enganche: ['creator'], trequartista_amc: ['creator', 'scorer'],
  winger: ['wide', 'creator'], inverted_winger: ['creator', 'runner'], inside_forward: ['scorer', 'runner'], raumdeuter: ['scorer'],
  af: ['scorer'], dlf: ['target', 'creator'], target_forward: ['target'], poacher: ['scorer'], complete_forward: ['scorer', 'creator', 'target'], pressing_forward: ['scorer', 'ballwinner'], false_nine: ['creator', 'scorer'],
};

function uniqueMetrics(roleId: string): ImportedMetricRule[] {
  const collected = (ROLE_SET[roleId] ?? ['progressor']).flatMap(set => SETS[set] ?? []);
  return [...new Map(collected.map(item => [item.id, item])).values()].slice(0, 5);
}
function mirrored(position: Position): Position[] {
  const pairs: Partial<Record<Position, Position>> = { DR: 'DL', DL: 'DR', WBR: 'WBL', WBL: 'WBR', MR: 'ML', ML: 'MR', AMR: 'AML', AML: 'AMR' };
  return pairs[position] ? [position, pairs[position]!] : [position];
}

export const ALL_ROLE_MATRIX_DEFINITIONS: RoleMatrixDefinition[] = ALL_ROLES.flatMap(role => role.availableDuties.map(duty => ({
  key: `${role.id}:${duty}`, roleId: role.id, roleName: role.name, duty, positions: mirrored(role.position),
  keyAttributes: role.keyAttributes, desirableAttributes: role.desirableAttributes, metrics: uniqueMetrics(role.id),
})));

const clamp = (value: number) => Math.max(0, Math.min(100, value));
function normalizedMetric(value: number, rule: ImportedMetricRule): number {
  const range = Math.abs(rule.strong - rule.baseline) || 1;
  const progress = rule.direction === 'higher' ? (value - rule.baseline) / range : (rule.baseline - value) / range;
  return clamp(50 + progress * 25);
}

export function rankPlayersForTacticSlot(slot: TacticSlot, players: Player[]): TacticPlayerCandidate[] {
  const definition = ALL_ROLE_MATRIX_DEFINITIONS.find(item => item.roleId === slot.roleId && item.duty === slot.duty);
  if (!definition) return [];
  return players.flatMap(player => {
    const position = player.positions.find(item => item.position === slot.position);
    if (!position) return [];
    const weightedAttributes = [...definition.keyAttributes.map(id => ({ id, weight: 2 })), ...definition.desirableAttributes.map(id => ({ id, weight: 1 }))];
    const knownAttributes = weightedAttributes.filter(item => typeof player.attributes[item.id] === 'number');
    const attributeWeight = knownAttributes.reduce((sum, item) => sum + item.weight, 0);
    const totalAttributeWeight = weightedAttributes.reduce((sum, item) => sum + item.weight, 0);
    const attributeCapacity = attributeWeight ? knownAttributes.reduce((sum, item) => sum + ((player.attributes[item.id] - 1) / 19) * 100 * item.weight, 0) / attributeWeight : null;
    const availableMetrics = definition.metrics.flatMap(rule => typeof player.performance?.metrics[rule.id] === 'number' ? [{ rule, value: player.performance.metrics[rule.id] }] : []);
    const metricWeight = availableMetrics.reduce((sum, item) => sum + item.rule.weight, 0);
    const rawPerformance = metricWeight ? availableMetrics.reduce((sum, item) => sum + normalizedMetric(item.value, item.rule) * item.rule.weight, 0) / metricWeight : null;
    const minutes = player.performance?.minutesPlayed ?? null;
    const minutesKind: TacticPlayerCandidate['minutesKind'] = player.performance?.minutesKind ?? 'missing';
    const reliability = minutes === null ? 0 : (minutes / (minutes + 900)) * .8;
    const adjustedPerformance = rawPerformance === null ? null : reliability * rawPerformance + (1 - reliability) * 50;
    const evidenceScore = adjustedPerformance === null ? null : adjustedPerformance - (1 - reliability) * 6;
    return [{ slotId: slot.slotId, playerId: player.id, playerName: player.name, roleLabel: `${slot.position} · ${definition.roleName} (${definition.duty})`, position: slot.position, familiarity: position.familiarity, attributeCapacity: attributeCapacity === null ? null : Math.round(attributeCapacity * 10) / 10, attributeCoverage: totalAttributeWeight ? attributeWeight / totalAttributeWeight : 0, minutes, minutesKind, rawPerformance: rawPerformance === null ? null : Math.round(rawPerformance * 10) / 10, adjustedPerformance: adjustedPerformance === null ? null : Math.round(adjustedPerformance * 10) / 10, reliability: Math.round(reliability * 1000) / 1000, metricCoverage: definition.metrics.length ? availableMetrics.length / definition.metrics.length : 0, evidenceScore: evidenceScore === null ? null : Math.round(evidenceScore * 10) / 10, missingMetrics: definition.metrics.filter(rule => !availableMetrics.some(item => item.rule.id === rule.id)).map(rule => rule.label) }];
  }).sort((a, b) => (b.evidenceScore ?? b.attributeCapacity ?? -1) - (a.evidenceScore ?? a.attributeCapacity ?? -1));
}
