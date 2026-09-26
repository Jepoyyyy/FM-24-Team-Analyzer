import { describe, it, expect } from 'vitest';
import { TacticSlot, Position, DEFAULT_TEAM_INSTRUCTIONS } from '../types';
import {
  createSimulationSnapshot,
  isSnapshotStale,
  calculateTeamCapacity,
  calculateTierCapacities,
  simulateScenario,
  runFullSimulationV2,
  getOpponentProfileV2,
  PlayerV2,
} from '../engine/v2';

function createMockPlayer(id: string, name: string, position: Position, baseAttr = 14): PlayerV2 {
  return {
    id,
    name,
    positions: [{ position, familiarity: 'Natural' }],
    attributes: {
      reflexes: baseAttr,
      handling: baseAttr,
      tackling: baseAttr,
      marking: baseAttr,
      heading: baseAttr,
      passing: baseAttr,
      vision: baseAttr,
      dribbling: baseAttr,
      finishing: baseAttr,
      composure: baseAttr,
      stamina: baseAttr,
      workRate: baseAttr,
      pace: baseAttr,
    },
  };
}

const sampleSlots: TacticSlot[] = [
  { slotId: 's1', position: 'GK', roleId: 'sk', duty: 'Support', x: 50, y: 88, customPIs: [], assignedPlayerId: 'p-gk' },
  { slotId: 's2', position: 'DR', roleId: 'ifb', duty: 'Defend', x: 85, y: 72, customPIs: [], assignedPlayerId: 'p-dr' },
  { slotId: 's3', position: 'DC', roleId: 'bpd', duty: 'Defend', x: 62, y: 75, customPIs: [], assignedPlayerId: 'p-dc1' },
  { slotId: 's4', position: 'DC', roleId: 'cd', duty: 'Defend', x: 38, y: 75, customPIs: [], assignedPlayerId: 'p-dc2' },
  { slotId: 's5', position: 'DL', roleId: 'wb', duty: 'Attack', x: 15, y: 72, customPIs: [], assignedPlayerId: 'p-dl' },
  { slotId: 's6', position: 'DM', roleId: 'anchor', duty: 'Defend', x: 38, y: 58, customPIs: [], assignedPlayerId: 'p-dm1' },
  { slotId: 's7', position: 'MC', roleId: 'bbm', duty: 'Support', x: 62, y: 44, customPIs: [], assignedPlayerId: 'p-mc1' },
  { slotId: 's8', position: 'AMC', roleId: 'ap', duty: 'Support', x: 50, y: 32, customPIs: [], assignedPlayerId: 'p-amc1' },
  { slotId: 's9', position: 'AMR', roleId: 'w', duty: 'Attack', x: 85, y: 25, customPIs: [], assignedPlayerId: 'p-amr1' },
  { slotId: 's10', position: 'AML', roleId: 'inside_forward', duty: 'Attack', x: 15, y: 25, customPIs: [], assignedPlayerId: 'p-aml1' },
  { slotId: 's11', position: 'STC', roleId: 'af', duty: 'Attack', x: 50, y: 15, customPIs: [], assignedPlayerId: 'p-st1' },
];

const mockPlayers: Record<string, PlayerV2> = {
  'p-gk': createMockPlayer('p-gk', 'Kiper', 'GK', 15),
  'p-dr': createMockPlayer('p-dr', 'Bek Kanan', 'DR', 14),
  'p-dc1': createMockPlayer('p-dc1', 'Bek Tengah 1', 'DC', 15),
  'p-dc2': createMockPlayer('p-dc2', 'Bek Tengah 2', 'DC', 15),
  'p-dl': createMockPlayer('p-dl', 'Bek Kiri', 'DL', 14),
  'p-dm1': createMockPlayer('p-dm1', 'Jangkar', 'DM', 14),
  'p-mc1': createMockPlayer('p-mc1', 'Gelandang', 'MC', 14),
  'p-amc1': createMockPlayer('p-amc1', 'Playmaker', 'AMC', 15),
  'p-amr1': createMockPlayer('p-amr1', 'Sayap Kanan', 'AMR', 15),
  'p-aml1': createMockPlayer('p-aml1', 'Sayap Kiri', 'AML', 15),
  'p-st1': createMockPlayer('p-st1', 'Striker', 'STC', 16),
};

describe('Tahap 5: Sandbox Monte Carlo & Matchup Rating', () => {
  it('calculates team capacity U and dynamic tiers satisfying below < equal < above', () => {
    const { capacityU, stdDevD } = calculateTeamCapacity(sampleSlots, mockPlayers);
    expect(capacityU).toBeGreaterThanOrEqual(10);
    expect(capacityU).toBeLessThanOrEqual(20);

    const tiers = calculateTierCapacities(capacityU, stdDevD);
    expect(tiers.below).toBeLessThan(tiers.equal);
    expect(tiers.equal).toBeLessThan(tiers.above);
    expect(tiers.delta).toBeGreaterThanOrEqual(1.5);
    expect(tiers.delta).toBeLessThanOrEqual(2.5);
  });

  it('produces byte-equivalent results when seeded with identical snapshot and config', () => {
    const snapshot = createSimulationSnapshot('4231_dm_wide', sampleSlots, DEFAULT_TEAM_INSTRUCTIONS, mockPlayers);
    const opp = getOpponentProfileV2('433_gegenpress');

    // Run 100 matches twice with identical seed
    const res1 = simulateScenario(snapshot, opp, 'equal', 14.0, 14.0, 100, mockPlayers);
    const res2 = simulateScenario(snapshot, opp, 'equal', 14.0, 14.0, 100, mockPlayers);

    expect(res1.winRate).toBe(res2.winRate);
    expect(res1.drawRate).toBe(res2.drawRate);
    expect(res1.lossRate).toBe(res2.lossRate);
    expect(res1.avgGoalsFor).toBe(res2.avgGoalsFor);
    expect(res1.avgGoalsAgainst).toBe(res2.avgGoalsAgainst);
    expect(res1.avgXGFor).toBe(res2.avgXGFor);
  });

  it('detects snapshot changes and flags old simulation results as outdated', () => {
    const snapshot1 = createSimulationSnapshot('4231_dm_wide', sampleSlots, DEFAULT_TEAM_INSTRUCTIONS, mockPlayers);

    // Modify mentality
    const alteredInstructions = { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: 'very_attacking' as const };
    const snapshot2 = createSimulationSnapshot('4231_dm_wide', sampleSlots, alteredInstructions, mockPlayers);

    expect(snapshot1.hash).not.toBe(snapshot2.hash);
    expect(isSnapshotStale(snapshot2, snapshot1)).toBe(true);
    expect(isSnapshotStale(snapshot1, snapshot1)).toBe(false);
  });

  it('generates all 24 scenarios with win/draw/loss summing to 100%', () => {
    const snapshot = createSimulationSnapshot('4231_dm_wide', sampleSlots, DEFAULT_TEAM_INSTRUCTIONS, mockPlayers);

    // Run quick full simulation with 20 matches per scenario to test structure
    let progressCalls = 0;
    const fullResult = runFullSimulationV2(
      snapshot,
      mockPlayers,
      { matchesPerScenario: 20 },
      () => {
        progressCalls++;
      }
    );

    expect(fullResult.scenarios).toHaveLength(24);
    expect(fullResult.totalMatches).toBe(24 * 20);
    expect(progressCalls).toBe(24);

    for (const sc of fullResult.scenarios) {
      const sum = Math.round((sc.winRate + sc.drawRate + sc.lossRate) * 10) / 10;
      expect(sum).toBe(100);
      expect(sc.confidenceInterval).toHaveLength(2);
      expect(sc.matchupRating).toBeGreaterThanOrEqual(5);
      expect(sc.matchupRating).toBeLessThanOrEqual(95);
    }
  });

  it('confirms team in above tier is statistically stronger than equal and below tier', () => {
    const snapshot = createSimulationSnapshot('4231_dm_wide', sampleSlots, DEFAULT_TEAM_INSTRUCTIONS, mockPlayers);
    const opp = getOpponentProfileV2('442_direct_counter');

    // Run 500 matches on each tier
    const resBelowOpp = simulateScenario(snapshot, opp, 'below', 11.5, 14.5, 500, mockPlayers); // Opponent is below user
    const resAboveOpp = simulateScenario(snapshot, opp, 'above', 17.5, 14.5, 500, mockPlayers); // Opponent is above user

    // User should perform much better against the below opponent than the above opponent
    expect(resBelowOpp.winRate).toBeGreaterThan(resAboveOpp.winRate);
    expect(resBelowOpp.avgGoalsFor).toBeGreaterThan(resAboveOpp.avgGoalsFor);
  });
});
