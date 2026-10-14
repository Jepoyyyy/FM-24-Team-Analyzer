import { RolePerformanceMetricDefinition, RolePerformanceSample } from '../engine/v2/playerPerformance';

export const PERFORMANCE_METRICS_BY_ROLE: Record<string, RolePerformanceMetricDefinition[]> = {
  'GK:Goalkeeper:Defend': [
    { id: 'save_pct', label: 'Save percentage', unit: '%', direction: 'higher', baseline: 72, strongBenchmark: 82, stabilizationOpportunities: 40, weight: 0.5 },
    { id: 'goals_prevented_p90', label: 'Goals prevented / 90', unit: '', direction: 'higher', baseline: 0, strongBenchmark: 0.28, stabilizationOpportunities: 55, weight: 0.3 },
    { id: 'cross_claim_pct', label: 'Claimable crosses secured', unit: '%', direction: 'higher', baseline: 88, strongBenchmark: 96, stabilizationOpportunities: 25, weight: 0.2 },
  ],
  'DR:Wing-Back:Attack': [
    { id: 'delivery_value_p90', label: 'Valuable deliveries / 90', unit: '', direction: 'higher', baseline: 1.2, strongBenchmark: 2.8, stabilizationOpportunities: 80, weight: 0.4 },
    { id: 'progressive_carries_p90', label: 'Progressive carries / 90', unit: '', direction: 'higher', baseline: 2.2, strongBenchmark: 4.5, stabilizationOpportunities: 90, weight: 0.3 },
    { id: 'recovery_success_pct', label: 'Recovery success', unit: '%', direction: 'higher', baseline: 61, strongBenchmark: 76, stabilizationOpportunities: 70, weight: 0.3 },
  ],
  'AMR:Inside Forward:Attack': [
    { id: 'npxg_p90', label: 'Non-penalty xG / 90', unit: '', direction: 'higher', baseline: 0.25, strongBenchmark: 0.55, stabilizationOpportunities: 55, weight: 0.4 },
    { id: 'box_reception_p90', label: 'Box receptions / 90', unit: '', direction: 'higher', baseline: 3.2, strongBenchmark: 6.2, stabilizationOpportunities: 100, weight: 0.3 },
    { id: 'pressure_regain_pct', label: 'Pressure-to-regain success', unit: '%', direction: 'higher', baseline: 22, strongBenchmark: 36, stabilizationOpportunities: 90, weight: 0.3 },
  ],
};

export const PLAYER_PERFORMANCE_MOCK: RolePerformanceSample[] = [
  {
    id: 'gk-small-perfect', playerId: 'raya', playerName: 'David Raya · short sample', position: 'GK', role: 'Goalkeeper', duty: 'Defend',
    roleMinutes: 180, starts: 2, substituteSegments: 0, stability: 0.55, attributeCapacity: 82,
    metrics: [
      { metricId: 'save_pct', value: 100, opportunities: 8 },
      { metricId: 'goals_prevented_p90', value: 0.7, opportunities: 8 },
      { metricId: 'cross_claim_pct', value: 100, opportunities: 5 },
    ],
  },
  {
    id: 'gk-stable-good', playerId: 'ud_gk', playerName: 'Mark Henderson · stable sample', position: 'GK', role: 'Goalkeeper', duty: 'Defend',
    roleMinutes: 1980, starts: 22, substituteSegments: 0, stability: 0.86, attributeCapacity: 62,
    metrics: [
      { metricId: 'save_pct', value: 78, opportunities: 90 },
      { metricId: 'goals_prevented_p90', value: 0.2, opportunities: 90 },
      { metricId: 'cross_claim_pct', value: 93, opportunities: 38 },
    ],
  },
  {
    id: 'gk-high-attributes-underperform', playerId: 'ederson', playerName: 'Ederson · tactical mismatch', position: 'GK', role: 'Goalkeeper', duty: 'Defend',
    roleMinutes: 1710, starts: 19, substituteSegments: 0, stability: 0.74, attributeCapacity: 88,
    metrics: [
      { metricId: 'save_pct', value: 68, opportunities: 74 },
      { metricId: 'goals_prevented_p90', value: -0.18, opportunities: 74 },
      { metricId: 'cross_claim_pct', value: 90, opportunities: 31 },
    ],
  },
  {
    id: 'wb-balanced', playerId: 'white', playerName: 'Benjamin White', position: 'DR', role: 'Wing-Back', duty: 'Attack',
    roleMinutes: 1620, starts: 18, substituteSegments: 1, stability: 0.8, attributeCapacity: 68,
    metrics: [
      { metricId: 'delivery_value_p90', value: 1.8, opportunities: 102 },
      { metricId: 'progressive_carries_p90', value: 2.7, opportunities: 126 },
      { metricId: 'recovery_success_pct', value: 73, opportunities: 81 },
    ],
  },
  {
    id: 'wb-explosive-small', playerId: 'walker', playerName: 'Kyle Walker · cameo role', position: 'DR', role: 'Wing-Back', duty: 'Attack',
    roleMinutes: 315, starts: 3, substituteSegments: 5, stability: 0.6, attributeCapacity: 72,
    metrics: [
      { metricId: 'delivery_value_p90', value: 3.4, opportunities: 19 },
      { metricId: 'progressive_carries_p90', value: 5.1, opportunities: 24 },
      { metricId: 'recovery_success_pct', value: 82, opportunities: 18 },
    ],
  },
  {
    id: 'if-stable', playerId: 'saka', playerName: 'Bukayo Saka', position: 'AMR', role: 'Inside Forward', duty: 'Attack',
    roleMinutes: 2070, starts: 23, substituteSegments: 1, stability: 0.88, attributeCapacity: 84,
    metrics: [
      { metricId: 'npxg_p90', value: 0.48, opportunities: 66 },
      { metricId: 'box_reception_p90', value: 5.7, opportunities: 148 },
      { metricId: 'pressure_regain_pct', value: 31, opportunities: 116 },
    ],
  },
];
