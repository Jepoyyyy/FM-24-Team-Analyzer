import { describe, it, expect } from 'vitest';
import { TacticSlot, Position, DEFAULT_TEAM_INSTRUCTIONS } from '../types';
import {
  solveMunkresRectangular,
  optimizeSquadAssignmentV2,
  recommendSquadFitV2,
  createAtomicApplyPayload,
  PlayerV2,
  PositionalFamiliarityV2,
} from '../engine/v2';

function createMockPlayer(
  id: string,
  name: string,
  position: Position,
  familiarity: PositionalFamiliarityV2 = 'Natural',
  baseAttr = 14
): PlayerV2 {
  return {
    id,
    name,
    positions: [{ position, familiarity }],
    attributes: {
      reflexes: baseAttr,
      handling: baseAttr,
      oneOnOnes: baseAttr,
      positioning: baseAttr,
      kicking: baseAttr,
      tackling: baseAttr,
      marking: baseAttr,
      heading: baseAttr,
      jumpingReach: baseAttr,
      strength: baseAttr,
      passing: baseAttr,
      vision: baseAttr,
      composure: baseAttr,
      decisions: baseAttr,
      crossing: baseAttr,
      dribbling: baseAttr,
      firstTouch: baseAttr,
      technique: baseAttr,
      pace: baseAttr,
      acceleration: baseAttr,
      stamina: baseAttr,
      workRate: baseAttr,
      finishing: baseAttr,
      offTheBall: baseAttr,
      anticipation: baseAttr,
    },
  };
}

describe('Tahap 4: Hungarian Optimizer & Recommender v2', () => {
  it('Hungarian algorithm outperforms greedy in a known trap scenario', () => {
    const costMatrix = [
      [100 - 95, 100 - 92],
      [100 - 90, 100 - 20],
    ];

    const match = solveMunkresRectangular(costMatrix);
    expect(match[0]).toBe(1);
    expect(match[1]).toBe(0);

    const hungarianTotal = 92 + 90;
    const greedyTotal = 95 + 20;
    expect(hungarianTotal).toBeGreaterThan(greedyTotal);
  });

  it('assigns 11 distinct players to 11 slots without duplicates', () => {
    // Generate 15 distinct players
    const mockSquad: PlayerV2[] = [
      createMockPlayer('p-gk', 'Goalkeeper 1', 'GK', 'Natural', 15),
      createMockPlayer('p-dr', 'Right Back 1', 'DR', 'Natural', 14),
      createMockPlayer('p-dl', 'Left Back 1', 'DL', 'Natural', 14),
      createMockPlayer('p-dc1', 'Centre Back 1', 'DC', 'Natural', 15),
      createMockPlayer('p-dc2', 'Centre Back 2', 'DC', 'Natural', 15),
      createMockPlayer('p-dm1', 'Holding Mid 1', 'DM', 'Natural', 14),
      createMockPlayer('p-mc1', 'Central Mid 1', 'MC', 'Natural', 14),
      createMockPlayer('p-amc1', 'Attacking Mid 1', 'AMC', 'Natural', 15),
      createMockPlayer('p-amr1', 'Right Winger 1', 'AMR', 'Natural', 15),
      createMockPlayer('p-aml1', 'Left Winger 1', 'AML', 'Natural', 15),
      createMockPlayer('p-st1', 'Striker 1', 'STC', 'Natural', 16),
      // Subs
      createMockPlayer('p-sub1', 'Backup DC', 'DC', 'Accomplished', 12),
      createMockPlayer('p-sub2', 'Backup MC', 'MC', 'Accomplished', 12),
      createMockPlayer('p-sub3', 'Backup ST', 'STC', 'Accomplished', 12),
      createMockPlayer('p-sub4', 'Backup GK', 'GK', 'Accomplished', 11),
    ];


    const slots: TacticSlot[] = [
      { slotId: 'slot-1', position: 'GK', roleId: 'sk', duty: 'Support', x: 50, y: 88, customPIs: [] },
      { slotId: 'slot-2', position: 'DR', roleId: 'ifb', duty: 'Defend', x: 85, y: 72, customPIs: [] },
      { slotId: 'slot-3', position: 'DC', roleId: 'bpd', duty: 'Defend', x: 62, y: 75, customPIs: [] },
      { slotId: 'slot-4', position: 'DC', roleId: 'cd', duty: 'Defend', x: 38, y: 75, customPIs: [] },
      { slotId: 'slot-5', position: 'DL', roleId: 'wb', duty: 'Attack', x: 15, y: 72, customPIs: [] },
      { slotId: 'slot-6', position: 'DM', roleId: 'anchor', duty: 'Defend', x: 38, y: 58, customPIs: [] },
      { slotId: 'slot-7', position: 'MC', roleId: 'bbm', duty: 'Support', x: 62, y: 44, customPIs: [] },
      { slotId: 'slot-8', position: 'AMC', roleId: 'ap', duty: 'Support', x: 50, y: 32, customPIs: [] },
      { slotId: 'slot-9', position: 'AMR', roleId: 'w', duty: 'Attack', x: 85, y: 25, customPIs: [] },
      { slotId: 'slot-10', position: 'AML', roleId: 'inside_forward', duty: 'Attack', x: 15, y: 25, customPIs: [] },
      { slotId: 'slot-11', position: 'STC', roleId: 'af', duty: 'Attack', x: 50, y: 15, customPIs: [] },
    ];

    const result = optimizeSquadAssignmentV2(slots, mockSquad);
    expect(result.assignedSlots).toHaveLength(11);

    const assignedIds = result.assignedSlots.map(s => s.assignedPlayerId).filter(Boolean);
    const uniqueIds = new Set(assignedIds);
    // Exactly 11 unique players assigned
    expect(uniqueIds.size).toBe(11);
    expect(result.averagePlayerFit).toBeGreaterThan(60);
    expect(result.unassignedPlayerIds).toHaveLength(4);
  });

  it('respects manually locked slots during global optimization', () => {
    const mockSquad: PlayerV2[] = [
      { id: 'p-gk', name: 'Goalkeeper 1', positions: [{ position: 'GK', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-dr', name: 'Right Back 1', positions: [{ position: 'DR', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-dl', name: 'Left Back 1', positions: [{ position: 'DL', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-dc1', name: 'Centre Back 1', positions: [{ position: 'DC', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-dc2', name: 'Centre Back 2', positions: [{ position: 'DC', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-dm1', name: 'Holding Mid 1', positions: [{ position: 'DM', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-mc1', name: 'Central Mid 1', positions: [{ position: 'MC', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-amc1', name: 'Attacking Mid 1', positions: [{ position: 'AMC', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-amr1', name: 'Right Winger 1', positions: [{ position: 'AMR', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-aml1', name: 'Left Winger 1', positions: [{ position: 'AML', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-st1', name: 'Striker 1', positions: [{ position: 'STC', familiarity: 'Natural' }], attributes: {} },
      { id: 'p-special-st', name: 'Special Striker', positions: [{ position: 'STC', familiarity: 'Natural' }], attributes: {} },
    ];

    const slots: TacticSlot[] = [
      { slotId: 'slot-1', position: 'GK', roleId: 'sk', duty: 'Support', x: 50, y: 88, customPIs: [] },
      { slotId: 'slot-2', position: 'DR', roleId: 'ifb', duty: 'Defend', x: 85, y: 72, customPIs: [] },
      { slotId: 'slot-3', position: 'DC', roleId: 'bpd', duty: 'Defend', x: 62, y: 75, customPIs: [] },
      { slotId: 'slot-4', position: 'DC', roleId: 'cd', duty: 'Defend', x: 38, y: 75, customPIs: [] },
      { slotId: 'slot-5', position: 'DL', roleId: 'wb', duty: 'Attack', x: 15, y: 72, customPIs: [] },
      { slotId: 'slot-6', position: 'DM', roleId: 'anchor', duty: 'Defend', x: 38, y: 58, customPIs: [] },
      { slotId: 'slot-7', position: 'MC', roleId: 'bbm', duty: 'Support', x: 62, y: 44, customPIs: [] },
      { slotId: 'slot-8', position: 'AMC', roleId: 'ap', duty: 'Support', x: 50, y: 32, customPIs: [] },
      { slotId: 'slot-9', position: 'AMR', roleId: 'w', duty: 'Attack', x: 85, y: 25, customPIs: [] },
      { slotId: 'slot-10', position: 'AML', roleId: 'inside_forward', duty: 'Attack', x: 15, y: 25, customPIs: [] },
      // Lock slot 11 to 'p-special-st'
      { slotId: 'slot-11', position: 'STC', roleId: 'af', duty: 'Attack', x: 50, y: 15, customPIs: [], assignedPlayerId: 'p-special-st' },
    ];

    const result = optimizeSquadAssignmentV2(slots, mockSquad, ['slot-11']);
    const stSlot = result.assignedSlots.find(s => s.slotId === 'slot-11');
    expect(stSlot?.assignedPlayerId).toBe('p-special-st');
    // Ensure 'p-special-st' was not assigned to any other slot
    const otherSlots = result.assignedSlots.filter(s => s.slotId !== 'slot-11');
    expect(otherSlots.some(s => s.assignedPlayerId === 'p-special-st')).toBe(false);
  });

  it('generates top 3 squad fit recommendations with diff preview and atomic apply', () => {
    const mockSquad: PlayerV2[] = [
      { id: 'p-gk', name: 'Goalkeeper 1', positions: [{ position: 'GK', familiarity: 'Natural' }], attributes: { Reflexes: 15, Handling: 14 } },
      { id: 'p-dr', name: 'Right Back 1', positions: [{ position: 'DR', familiarity: 'Natural' }], attributes: { Tackling: 14, Crossing: 12, Pace: 14 } },
      { id: 'p-dl', name: 'Left Back 1', positions: [{ position: 'DL', familiarity: 'Natural' }], attributes: { Tackling: 13, Crossing: 14, Pace: 15 } },
      { id: 'p-dc1', name: 'Centre Back 1', positions: [{ position: 'DC', familiarity: 'Natural' }], attributes: { Tackling: 16, Heading: 15, Strength: 15 } },
      { id: 'p-dc2', name: 'Centre Back 2', positions: [{ position: 'DC', familiarity: 'Natural' }], attributes: { Tackling: 15, Heading: 14, JumpingReach: 15 } },
      { id: 'p-dm1', name: 'Holding Mid 1', positions: [{ position: 'DM', familiarity: 'Natural' }], attributes: { Tackling: 15, Positioning: 14, WorkRate: 15 } },
      { id: 'p-mc1', name: 'Central Mid 1', positions: [{ position: 'MC', familiarity: 'Natural' }], attributes: { Passing: 15, Vision: 14, Decisions: 14 } },
      { id: 'p-amc1', name: 'Attacking Mid 1', positions: [{ position: 'AMC', familiarity: 'Natural' }], attributes: { Vision: 16, Technique: 15, Passing: 15 } },
      { id: 'p-amr1', name: 'Right Winger 1', positions: [{ position: 'AMR', familiarity: 'Natural' }], attributes: { Dribbling: 15, Pace: 16, Crossing: 14 } },
      { id: 'p-aml1', name: 'Left Winger 1', positions: [{ position: 'AML', familiarity: 'Natural' }], attributes: { Dribbling: 16, Pace: 15, Finishing: 13 } },
      { id: 'p-st1', name: 'Striker 1', positions: [{ position: 'STC', familiarity: 'Natural' }], attributes: { Finishing: 16, Composure: 15, OffTheBall: 15 } },
    ];

    const currentSlots: TacticSlot[] = [
      { slotId: 'slot-1', position: 'GK', roleId: 'gk', duty: 'Defend', x: 50, y: 88, customPIs: [] },
      { slotId: 'slot-2', position: 'DR', roleId: 'fb', duty: 'Defend', x: 85, y: 72, customPIs: [] },
      { slotId: 'slot-3', position: 'DC', roleId: 'cd', duty: 'Defend', x: 62, y: 75, customPIs: [] },
      { slotId: 'slot-4', position: 'DC', roleId: 'cd', duty: 'Defend', x: 38, y: 75, customPIs: [] },
      { slotId: 'slot-5', position: 'DL', roleId: 'fb', duty: 'Defend', x: 15, y: 72, customPIs: [] },
      { slotId: 'slot-6', position: 'MC', roleId: 'cm', duty: 'Defend', x: 60, y: 55, customPIs: [] },
      { slotId: 'slot-7', position: 'MC', roleId: 'cm', duty: 'Support', x: 40, y: 55, customPIs: [] },
      { slotId: 'slot-8', position: 'AMR', roleId: 'w', duty: 'Support', x: 85, y: 35, customPIs: [] },
      { slotId: 'slot-9', position: 'AML', roleId: 'w', duty: 'Support', x: 15, y: 35, customPIs: [] },
      { slotId: 'slot-10', position: 'STC', roleId: 'af', duty: 'Attack', x: 60, y: 15, customPIs: [] },
      { slotId: 'slot-11', position: 'STC', roleId: 'tm', duty: 'Support', x: 40, y: 15, customPIs: [] },
    ];

    const recs = recommendSquadFitV2(mockSquad, currentSlots, '442_flat', DEFAULT_TEAM_INSTRUCTIONS);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);

    const topRec = recs[0];
    expect(topRec.compositeScore).toBeGreaterThan(0);
    expect(topRec.slots).toHaveLength(11);
    expect(topRec.keyPlayers.length).toBeGreaterThan(0);
    expect(topRec.diff).toBeDefined();

    // Verify atomic apply payload creation
    const payload = createAtomicApplyPayload(currentSlots, '442_flat', DEFAULT_TEAM_INSTRUCTIONS, topRec);
    expect(payload.targetRecommendationId).toBe(topRec.id);
    expect(payload.previousStateSnapshot.slots).toHaveLength(11);
    expect(payload.newState.slots).toHaveLength(11);
    expect(payload.newState.analysis).toBeDefined();
  });
});
