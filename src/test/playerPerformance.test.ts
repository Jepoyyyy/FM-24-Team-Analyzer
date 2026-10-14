// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PERFORMANCE_METRICS_BY_ROLE, PLAYER_PERFORMANCE_MOCK } from '../data/playerPerformanceMock';
import { evaluateRolePerformance, rankComparableSamples } from '../engine/v2/playerPerformance';

const goalkeeperDefinitions = PERFORMANCE_METRICS_BY_ROLE['GK:Goalkeeper:Defend'];

describe('role performance reliability engine', () => {
  it('does not let a perfect tiny sample automatically beat stable evidence', () => {
    const goalkeeperSamples = PLAYER_PERFORMANCE_MOCK.filter(sample => sample.position === 'GK');
    const ranked = rankComparableSamples(goalkeeperSamples, PERFORMANCE_METRICS_BY_ROLE);

    expect(ranked[0].sampleId).toBe('gk-stable-good');
    expect(ranked.find(result => result.sampleId === 'gk-small-perfect')?.reliabilityBand).toBe('insufficient');
    expect(ranked.find(result => result.sampleId === 'gk-small-perfect')?.rawPerformance).toBeGreaterThan(90);
  });

  it('uses role-minutes and opportunities together', () => {
    const source = PLAYER_PERFORMANCE_MOCK.find(sample => sample.id === 'gk-stable-good')!;
    const full = evaluateRolePerformance(source, goalkeeperDefinitions);
    const scarceMinutes = evaluateRolePerformance({ ...source, roleMinutes: 180 }, goalkeeperDefinitions);
    const scarceEvents = evaluateRolePerformance({ ...source, metrics: source.metrics.map(metric => ({ ...metric, opportunities: 8 })) }, goalkeeperDefinitions);

    expect(scarceMinutes.reliability).toBeLessThan(full.reliability);
    expect(scarceEvents.reliability).toBeLessThan(full.reliability);
  });

  it('keeps raw values visible while shrinking estimates toward each metric baseline', () => {
    const source = PLAYER_PERFORMANCE_MOCK.find(sample => sample.id === 'gk-small-perfect')!;
    const result = evaluateRolePerformance(source, goalkeeperDefinitions);
    const saves = result.metrics.find(metric => metric.metricId === 'save_pct')!;

    expect(saves.rawValue).toBe(100);
    expect(saves.adjustedValue).toBeGreaterThan(72);
    expect(saves.adjustedValue).toBeLessThan(100);
    expect(saves.adjustedScore).toBeLessThan(saves.rawScore);
  });

  it('flags the capacity-performance gap without treating it as proof of player failure', () => {
    const source = PLAYER_PERFORMANCE_MOCK.find(sample => sample.id === 'gk-high-attributes-underperform')!;
    const result = evaluateRolePerformance(source, goalkeeperDefinitions);

    expect(result.attributeCapacity).toBe(88);
    expect(result.adjustedPerformance).toBeLessThan(result.attributeCapacity - 10);
    expect(result.diagnosis).toContain('Periksa akses taktis');
  });
});
