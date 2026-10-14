export type MetricDirection = 'higher' | 'lower';
export type ReliabilityBand = 'insufficient' | 'low' | 'usable' | 'strong';

export interface RolePerformanceMetricDefinition {
  id: string;
  label: string;
  unit: string;
  direction: MetricDirection;
  baseline: number;
  strongBenchmark: number;
  stabilizationOpportunities: number;
  weight: number;
}

export interface ObservedRoleMetric {
  metricId: string;
  value: number;
  opportunities: number;
}

export interface RolePerformanceSample {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  role: string;
  duty: string;
  roleMinutes: number;
  starts: number;
  substituteSegments: number;
  stability: number;
  attributeCapacity: number;
  metrics: ObservedRoleMetric[];
}

export interface AdjustedMetricResult {
  metricId: string;
  label: string;
  unit: string;
  rawValue: number;
  adjustedValue: number;
  rawScore: number;
  adjustedScore: number;
  opportunities: number;
  reliability: number;
  weight: number;
  explanation: string;
}

export interface RolePerformanceResult {
  sampleId: string;
  playerId: string;
  playerName: string;
  roleLabel: string;
  roleMinutes: number;
  starts: number;
  substituteSegments: number;
  stability: number;
  attributeCapacity: number;
  rawPerformance: number;
  adjustedPerformance: number;
  evidenceScore: number;
  reliability: number;
  reliabilityBand: ReliabilityBand;
  metrics: AdjustedMetricResult[];
  diagnosis: string;
}

export const PLAYER_PERFORMANCE_MODEL_VERSION = 'role-evidence-0.2.0';
const MINUTES_STABILIZATION = 900;
const UNCERTAINTY_PENALTY = 8;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function performanceScore(value: number, definition: RolePerformanceMetricDefinition): number {
  const range = Math.abs(definition.strongBenchmark - definition.baseline);
  if (range === 0) return 50;
  const progress = definition.direction === 'higher'
    ? (value - definition.baseline) / range
    : (definition.baseline - value) / range;
  return clamp(50 + progress * 25);
}

export function reliabilityBandFor(roleMinutes: number, opportunities: number, reliability: number): ReliabilityBand {
  if (roleMinutes < 270 || opportunities < 10) return 'insufficient';
  if (roleMinutes < 900 || reliability < 0.45) return 'low';
  if (roleMinutes < 1800 || reliability < 0.68) return 'usable';
  return 'strong';
}

export function evaluateRolePerformance(
  sample: RolePerformanceSample,
  definitions: RolePerformanceMetricDefinition[],
): RolePerformanceResult {
  const definitionMap = new Map(definitions.map(definition => [definition.id, definition]));
  const minutesReliability = sample.roleMinutes / (sample.roleMinutes + MINUTES_STABILIZATION);

  const metrics = sample.metrics.flatMap(metric => {
    const definition = definitionMap.get(metric.metricId);
    if (!definition) return [];
    const opportunityReliability = metric.opportunities
      / (metric.opportunities + definition.stabilizationOpportunities);
    // Both exposure dimensions must grow. The geometric mean prevents either
    // abundant minutes or abundant events from hiding weakness in the other.
    const sampleReliability = Math.sqrt(minutesReliability * opportunityReliability);
    const contextReliability = 0.75 + clamp(sample.stability, 0, 1) * 0.25;
    const reliability = clamp(sampleReliability * contextReliability, 0, 1);
    const adjustedValue = reliability * metric.value + (1 - reliability) * definition.baseline;

    return [{
      metricId: metric.metricId,
      label: definition.label,
      unit: definition.unit,
      rawValue: metric.value,
      adjustedValue: round(adjustedValue, 2),
      rawScore: round(performanceScore(metric.value, definition)),
      adjustedScore: round(performanceScore(adjustedValue, definition)),
      opportunities: metric.opportunities,
      reliability: round(reliability, 3),
      weight: definition.weight,
      explanation: `${sample.roleMinutes} role-minutes + ${metric.opportunities} relevant opportunities; baseline ${definition.baseline}${definition.unit}.`,
    } satisfies AdjustedMetricResult];
  });

  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  const weighted = (key: 'rawScore' | 'adjustedScore' | 'reliability') => totalWeight === 0
    ? 0
    : metrics.reduce((sum, metric) => sum + metric[key] * metric.weight, 0) / totalWeight;
  const rawPerformance = weighted('rawScore');
  const adjustedPerformance = weighted('adjustedScore');
  const reliability = weighted('reliability');
  const minimumOpportunities = metrics.length ? Math.min(...metrics.map(metric => metric.opportunities)) : 0;
  const band = reliabilityBandFor(sample.roleMinutes, minimumOpportunities, reliability);
  const evidenceScore = band === 'insufficient'
    ? adjustedPerformance - (1 - reliability) * UNCERTAINTY_PENALTY
    : adjustedPerformance - (1 - reliability) * (UNCERTAINTY_PENALTY / 2);

  const performanceGap = adjustedPerformance - sample.attributeCapacity;
  const diagnosis = band === 'insufficient'
    ? 'Sampel belum cukup untuk verdict. Pertahankan sebagai observasi, bukan bukti kualitas stabil.'
    : performanceGap <= -10
      ? 'Output tertinggal dari capacity atribut. Periksa akses taktis, kualitas peluang, role familiarity, dan konteks lawan.'
      : performanceGap >= 10
        ? 'Output melampaui capacity atribut. Periksa apakah konteks menguntungkan atau performa ini bertahan pada jendela berikutnya.'
        : 'Output dan capacity atribut berada dalam rentang yang selaras; lanjutkan pemantauan stabilitas.';

  return {
    sampleId: sample.id,
    playerId: sample.playerId,
    playerName: sample.playerName,
    roleLabel: `${sample.position} · ${sample.role} (${sample.duty})`,
    roleMinutes: sample.roleMinutes,
    starts: sample.starts,
    substituteSegments: sample.substituteSegments,
    stability: sample.stability,
    attributeCapacity: sample.attributeCapacity,
    rawPerformance: round(rawPerformance),
    adjustedPerformance: round(adjustedPerformance),
    evidenceScore: round(clamp(evidenceScore)),
    reliability: round(reliability, 3),
    reliabilityBand: band,
    metrics,
    diagnosis,
  };
}

export function rankComparableSamples(
  samples: RolePerformanceSample[],
  definitionsByRole: Record<string, RolePerformanceMetricDefinition[]>,
): RolePerformanceResult[] {
  return samples
    .map(sample => evaluateRolePerformance(sample, definitionsByRole[`${sample.position}:${sample.role}:${sample.duty}`] ?? []))
    .sort((a, b) => b.evidenceScore - a.evidenceScore);
}
