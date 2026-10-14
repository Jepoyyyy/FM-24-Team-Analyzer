// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEAM_INSTRUCTIONS, Player, TacticSlot } from '../types';
import { ALL_ROLES } from '../engine/roles';
import { evaluatePlayerLab, EXPERIMENTAL_THRESHOLDS, isPlausibleExperimentalTransfer, playerLabDefinitionGaps, reconcileSlotFit, sortPlayerLabRows } from '../engine/v2/playerLabEvaluation';

const slot: TacticSlot = { slotId: 'rb', position: 'DR', x: 80, y: 70, roleId: 'wb', duty: 'Attack', customPIs: [] };
const attributes = { crossing: 16, dribbling: 15, tackling: 15, marking: 14, workRate: 17, stamina: 17, pace: 16, acceleration: 16, passing: 14, technique: 14, decisions: 14, positioning: 14, offTheBall: 14, vision: 13, firstTouch: 13, anticipation: 14, strength: 13 };
const player = (id: string, name: string, minutes: number, metricValue: number, position: Player['positions'][number]['position'] = 'DR'): Player => ({ id, name, age: 24, positions: [{ position, familiarity: 'Natural' }], attributes, performance: { minutesPlayed: minutes, appearances: 10, starts: 8, substituteAppearances: 2, averageRating: 7, minutesKind: 'total_minutes_proxy', importedHeaders: [], metrics: { crossesCompletedP90: metricValue, dribblesP90: metricValue, tackleWinPct: metricValue } } });

describe('Player Lab evaluation model', () => {
  it('covers every declared role-duty with profile, metrics, behaviour and explanation', () => {
    expect(playerLabDefinitionGaps()).toEqual([]);
    expect(ALL_ROLES.reduce((sum, role) => sum + role.availableDuties.length, 0)).toBe(85);
  });
  it('keeps a reconciling ledger, alternate active slots and visible proxy reliability', () => {
    const left = { ...slot, slotId: 'rb-support', duty: 'Support' as const };
    const result = evaluatePlayerLab([player('a', 'Alpha', 1200, 78), player('b', 'Beta', 13, 100)], [slot, left], DEFAULT_TEAM_INSTRUCTIONS);
    const alpha = result.natural.find(row => row.playerId === 'a')!;
    expect(alpha.alternatives).toHaveLength(1);
    expect(reconcileSlotFit(alpha.bestSlot!)).toBe(alpha.formationFit);
    expect(alpha.bestSlot!.performance.minutesKind).toBe('total_minutes_proxy');
    expect(result.natural[0].playerId).toBe('a');
  });
  it('changes demand with mentality/team instructions and emits all radar axes', () => {
    const passive = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [slot], { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: 'defensive', pressingIntensity: 'less_often' });
    const aggressive = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [slot], { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: 'very_attacking', pressingIntensity: 'much_more_often' });
    expect(aggressive.demands[0].behaviorDemand.penetrationScoring).toBeGreaterThan(passive.demands[0].behaviorDemand.penetrationScoring);
    expect(Object.keys(aggressive.natural[0].radar.player)).toHaveLength(6);
  });
  it('applies active mentality, TIs and PIs to the reconciling fit ledger, not only the radar explanation', () => {
    const passive = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [slot], { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: 'defensive', pressingIntensity: 'less_often', passingDirectness: 'shorter', earlyCrosses: false });
    const activeSlot: TacticSlot = { ...slot, customPIs: ['get_further_forward', 'cross_more_often', 'close_down_more'] };
    const aggressive = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [activeSlot], { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: 'very_attacking', pressingIntensity: 'much_more_often', passingDirectness: 'direct', earlyCrosses: true, passIntoSpace: true });
    const passiveDemand = passive.natural[0].bestSlot!.ledger.find(entry => entry.id === 'tactic-demand')!;
    const aggressiveDemand = aggressive.natural[0].bestSlot!.ledger.find(entry => entry.id === 'tactic-demand')!;
    expect(aggressiveDemand.value).not.toBe(passiveDemand.value);
    expect(aggressive.natural[0].formationFit).not.toBe(passive.natural[0].formationFit);
    expect(aggressive.natural[0].bestSlot!.compensationNotes.length).toBeGreaterThan(0);
    const demandContribution = aggressive.natural[0].bestSlot!.demandEvidence.reduce((sum, item) => sum + item.contribution, 0);
    expect(demandContribution).toBeCloseTo(aggressiveDemand.value, 2);
    expect(aggressive.natural[0].bestSlot!.demandEvidence).toHaveLength(6);
    expect(reconcileSlotFit(aggressive.natural[0].bestSlot!)).toBe(aggressive.natural[0].formationFit);
  });
  it('does not make unrelated instructions or PIs change the observed fit', () => {
    const baseline = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [slot], DEFAULT_TEAM_INSTRUCTIONS);
    const unrelated: TacticSlot = { ...slot, customPIs: ['cross_aim_near_post'] };
    const changed = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [unrelated], {
      ...DEFAULT_TEAM_INSTRUCTIONS,
      gkDistributionType: 'long_kicks',
      tackling: 'get_stuck_in',
    });
    expect(changed.natural[0].formationFit).toBe(baseline.natural[0].formationFit);
    expect(changed.natural[0].bestSlot!.ledger).toEqual(baseline.natural[0].bestSlot!.ledger);
  });
  it('segregates only threshold-qualified plausible transfers and retains risk', () => {
    const winger = player('w', 'Winger', 900, 75, 'AMR');
    const result = evaluatePlayerLab([winger], [slot], DEFAULT_TEAM_INSTRUCTIONS);
    expect(result.experimental).toHaveLength(1);
    expect(result.experimental[0].bestSlot!.familiarityRisk).toBe(EXPERIMENTAL_THRESHOLDS.familiarityPenalty);
    expect(isPlausibleExperimentalTransfer('GK', 'STC')).toBe(false);
    expect(isPlausibleExperimentalTransfer('AMR', 'DR')).toBe(true);
  });
  it('sorts deterministically with player name and id fallbacks', () => {
    const result = evaluatePlayerLab([player('z', 'Same', 900, 75), player('a', 'Same', 900, 75)], [slot], DEFAULT_TEAM_INSTRUCTIONS);
    expect(sortPlayerLabRows(result.natural).map(row => row.playerId)).toEqual(['a', 'z']);
    expect(sortPlayerLabRows(result.natural, 'name', 'asc').map(row => row.playerId)).toEqual(['a', 'z']);
  });
  it('retains a natural best slot and qualified experimental alternatives in independent collections', () => {
    const left = { ...slot, slotId: 'wingback', position: 'WBR' as const };
    const leftSupport = { ...left, slotId: 'wingback-support', duty: 'Support' as const };
    const result = evaluatePlayerLab([player('a', 'Alpha', 1200, 78)], [slot, left, leftSupport], DEFAULT_TEAM_INSTRUCTIONS);
    expect(result.natural).toHaveLength(1);
    expect(result.experimental).toHaveLength(1);
    expect(result.natural[0].bestSlot!.slotId).toBe('rb');
    expect(result.natural[0].alternatives).toEqual([]);
    const experimental = result.experimental[0];
    expect(experimental.playerId).toBe(result.natural[0].playerId);
    expect(experimental.alternatives).toHaveLength(1);
    expect(new Set([experimental.bestSlot!, ...experimental.alternatives].map(candidate => candidate.slotId))).toEqual(new Set(['wingback', 'wingback-support']));
    for (const candidate of [experimental.bestSlot!, ...experimental.alternatives]) {
      expect(candidate.candidateType).toBe('experimental');
      expect(candidate.familiarityRisk).toBe(EXPERIMENTAL_THRESHOLDS.familiarityPenalty);
      expect(reconcileSlotFit(candidate)).toBe(candidate.fit);
    }
    expect(experimental.bestSlot!.fit).toBeGreaterThanOrEqual(experimental.alternatives[0].fit);
  });
});
