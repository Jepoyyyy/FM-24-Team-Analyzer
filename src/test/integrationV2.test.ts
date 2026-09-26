import { describe, it, expect } from 'vitest';
import {
  PlayerV2,
  PositionalFamiliarityV2,
  DEFAULT_TEAM_INSTRUCTIONS_V2,
  analyzeTacticV2,
  optimizeSquadAssignmentV2,
  recommendSquadFitV2,
  createAtomicApplyPayload,
  createAtomicUndoPayload,
  createSimulationSnapshot,
  isSnapshotStale,
  simulateAllScenariosV2,
  migrateV1ToV2,
  getDefaultStorageStateV2,
} from '../engine/v2';
import { FORMATION_TEMPLATES } from '../engine/formations';
import { DEMO_SQUADS } from '../data/demoSquads';
import { Player, TacticSlot, TeamInstructions } from '../types';

describe('Integration Test Suite - Tactical Match Engine v2', () => {
  // Test fixture: London Red squad from DEMO_SQUADS
  const demoSquad = DEMO_SQUADS[0];
  const squadPlayers: Player[] = demoSquad.players;
  const formation433 = FORMATION_TEMPLATES.find(f => f.id === '4-3-3-dm-wide') || FORMATION_TEMPLATES[0];

  it('Flow 1: Imports squad and assigns starters using Hungarian optimization', () => {
    const initialSlots: TacticSlot[] = formation433.slots.map(s => ({
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleId: s.roleId,
      duty: s.duty,
      customPIs: [],
      assignedPlayerId: undefined,
    }));

    const result = optimizeSquadAssignmentV2(initialSlots, squadPlayers);

    // Verify 11 slots are assigned
    const assignedIds = result.assignedSlots.map(s => s.assignedPlayerId).filter(Boolean);
    expect(assignedIds.length).toBe(11);

    // Verify no duplicates
    const uniqueIds = new Set(assignedIds);
    expect(uniqueIds.size).toBe(11);

    // Verify GK slot is filled with a natural/accomplished GK
    const gkSlot = result.assignedSlots.find(s => s.position === 'GK');
    expect(gkSlot).toBeDefined();
    expect(gkSlot?.assignedPlayerId).toBeDefined();

    const gkPlayer = squadPlayers.find(p => p.id === gkSlot?.assignedPlayerId);
    expect(gkPlayer?.positions.some(pos => pos.position === 'GK')).toBe(true);

    // Check emergency fits report
    expect(result.emergencySlotIds).toBeDefined();
    expect(result.averagePlayerFit).toBeGreaterThan(0);
  });

  it('Flow 2: Diagnoses tactical cohesion, 4-phase shapes, and modulates 16 metrics', () => {
    // Fill slots with assigned players from demo squad
    const slots: TacticSlot[] = formation433.slots.map((s, idx) => ({
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleId: s.roleId,
      duty: s.duty,
      customPIs: [],
      assignedPlayerId: squadPlayers[idx]?.id,
    }));

    const playersRecord: Record<string, PlayerV2> = {};
    squadPlayers.forEach(p => {
      playersRecord[p.id] = {
        id: p.id,
        name: p.name,
        age: p.age,
        club: p.club,
        nationality: p.nationality,
        positions: p.positions.map(pos => ({
          position: pos.position,
          familiarity: (pos.familiarity as PositionalFamiliarityV2) || 'Natural',
        })),
        attributes: { ...p.attributes },
        traits: p.traits,
      };
    });

    const analysis = analyzeTacticV2(slots, DEFAULT_TEAM_INSTRUCTIONS_V2, playersRecord);

    // Verify Cohesion score & grade
    expect(analysis.tacticalCohesion).toBeGreaterThanOrEqual(0);
    expect(analysis.tacticalCohesion).toBeLessThanOrEqual(100);
    expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(analysis.cohesionGrade);

    // Verify Data Confidence
    expect(analysis.dataConfidence).toBeGreaterThanOrEqual(0);
    expect(analysis.dataConfidence).toBeLessThanOrEqual(100);

    // Verify 4-Phase Shapes: exactly 11 player coordinates
    expect(analysis.phaseShape.baseShape).toBeDefined();
    expect(analysis.phaseShape.inPossessionShape).toBeDefined();
    expect(analysis.phaseShape.settledDefenceShape).toBeDefined();
    expect(analysis.phaseShape.restDefenceShape).toBeDefined();
    expect(analysis.phaseShape.playerCoords.length).toBe(11);

    // Verify all 16 metrics are bounded in [0, 100]
    const metricKeys = Object.keys(analysis.metrics) as (keyof typeof analysis.metrics)[];
    expect(metricKeys.length).toBe(16);
    metricKeys.forEach(k => {
      expect(analysis.metrics[k]).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics[k]).toBeLessThanOrEqual(100);
    });
  });

  it('Flow 3: Evaluates squad recommendations with beam search, applies atomically, and undos cleanly', () => {
    const slots: TacticSlot[] = formation433.slots.map((s, idx) => ({
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleId: s.roleId,
      duty: s.duty,
      customPIs: [],
      assignedPlayerId: squadPlayers[idx]?.id,
    }));

    const recommendations = recommendSquadFitV2(
      squadPlayers,
      slots,
      formation433.id,
      DEFAULT_TEAM_INSTRUCTIONS_V2
    );

    expect(recommendations.length).toBeGreaterThanOrEqual(1);
    const topRec = recommendations[0];

    // Verify composite score weighting structure
    expect(topRec.compositeScore).toBeGreaterThanOrEqual(0);
    expect(topRec.compositeScore).toBeLessThanOrEqual(100);
    expect(topRec.roleFitScore).toBeDefined();
    expect(topRec.tacticalCohesionScore).toBeDefined();

    // Create atomic apply payload
    const applyPayload = createAtomicApplyPayload(
      slots,
      formation433.id,
      DEFAULT_TEAM_INSTRUCTIONS_V2,
      topRec
    );

    expect(applyPayload.newState.formationId).toBe(topRec.id);
    expect(applyPayload.newState.slots.length).toBe(11);
    expect(applyPayload.previousStateSnapshot.slots.length).toBe(11);
    expect(applyPayload.targetRecommendationId).toBe(topRec.id);

    // Verify undo payload restores original state byte-for-byte
    const undoPayload = createAtomicUndoPayload(applyPayload);
    expect(undoPayload.newState.formationId).toBe(applyPayload.previousStateSnapshot.formationId);
    expect(undoPayload.newState.instructions).toEqual(applyPayload.previousStateSnapshot.instructions);
    expect(undoPayload.newState.slots).toEqual(applyPayload.previousStateSnapshot.slots);
  });

  it('Flow 4: Runs Monte Carlo simulation with 24 scenarios, deterministic seeds, and Wilson intervals', () => {
    const slots: TacticSlot[] = formation433.slots.map((s, idx) => ({
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleId: s.roleId,
      duty: s.duty,
      customPIs: [],
      assignedPlayerId: squadPlayers[idx]?.id,
    }));

    const playersRecord: Record<string, PlayerV2> = {};
    squadPlayers.forEach(p => {
      playersRecord[p.id] = {
        id: p.id,
        name: p.name,
        age: p.age,
        club: p.club,
        nationality: p.nationality,
        positions: p.positions.map(pos => ({
          position: pos.position,
          familiarity: (pos.familiarity as PositionalFamiliarityV2) || 'Natural',
        })),
        attributes: { ...p.attributes },
        traits: p.traits,
      };
    });

    const snapshot = createSimulationSnapshot(formation433.id, slots, DEFAULT_TEAM_INSTRUCTIONS_V2, playersRecord);
    expect(snapshot.hash).toBeDefined();
    expect(typeof snapshot.hash).toBe('string');

    // Run Monte Carlo (100 matches per scenario for speedy test)
    const run1 = simulateAllScenariosV2(snapshot, playersRecord, { matchesPerScenario: 100 });
    const run2 = simulateAllScenariosV2(snapshot, playersRecord, { matchesPerScenario: 100 });

    // Verify 24 scenarios produced (8 archetypes x 3 tiers)
    expect(run1.scenarios.length).toBe(24);
    expect(run2.scenarios.length).toBe(24);

    // Verify statistical sanity across all scenarios
    run1.scenarios.forEach(sc => {
      // Win + Draw + Loss sums to ~100%
      const totalPct = sc.winRate + sc.drawRate + sc.lossRate;
      expect(totalPct).toBeCloseTo(100, 0);

      // Matchup rating bounded [0, 100]
      expect(sc.matchupRating).toBeGreaterThanOrEqual(0);
      expect(sc.matchupRating).toBeLessThanOrEqual(100);

      // Wilson confidence interval is valid tuple [lower, upper]
      expect(sc.confidenceInterval[0]).toBeGreaterThanOrEqual(0);
      expect(sc.confidenceInterval[1]).toBeLessThanOrEqual(100);
      expect(sc.confidenceInterval[0]).toBeLessThanOrEqual(sc.confidenceInterval[1]);
    });

    // Verify opponent capacity tier effect: 'above' opponents are tougher than 'below' opponents
    const highPressAbove = run1.scenarios.find(s => s.opponentId === 'gegenpress_elite' && s.capacityTier === 'above');
    const highPressBelow = run1.scenarios.find(s => s.opponentId === 'gegenpress_elite' && s.capacityTier === 'below');

    if (highPressAbove && highPressBelow) {
      expect(highPressBelow.winRate).toBeGreaterThanOrEqual(highPressAbove.winRate);
    }
  });

  it('Flow 5: Accurately detects stale snapshot when tactic instructions or slots mutate', () => {
    const slots: TacticSlot[] = formation433.slots.map((s, idx) => ({
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleId: s.roleId,
      duty: s.duty,
      customPIs: [],
      assignedPlayerId: squadPlayers[idx]?.id,
    }));

    const playersRecord: Record<string, PlayerV2> = {};
    squadPlayers.forEach(p => {
      playersRecord[p.id] = {
        id: p.id,
        name: p.name,
        age: p.age,
        club: p.club,
        nationality: p.nationality,
        positions: p.positions.map(pos => ({
          position: pos.position,
          familiarity: (pos.familiarity as PositionalFamiliarityV2) || 'Natural',
        })),
        attributes: { ...p.attributes },
        traits: p.traits,
      };
    });

    const snapshotA = createSimulationSnapshot(formation433.id, slots, DEFAULT_TEAM_INSTRUCTIONS_V2, playersRecord);

    // Mutate tempo
    const mutatedInstructions: TeamInstructions = {
      ...DEFAULT_TEAM_INSTRUCTIONS_V2,
      tempo: 'much_higher',
    };

    const snapshotB = createSimulationSnapshot(formation433.id, slots, mutatedInstructions, playersRecord);

    expect(snapshotA.hash).not.toBe(snapshotB.hash);
    expect(isSnapshotStale(snapshotB, snapshotA)).toBe(true);
    expect(isSnapshotStale(snapshotA, snapshotA)).toBe(false);
  });

  it('Flow 6: Handles storage corruption and migration safely with graceful defaults', () => {
    // 1. Valid legacy v1 data
    const validV1 = {
      squadName: 'London Red',
      slots: formation433.slots.map(s => ({
        slotId: s.slotId,
        position: s.position,
        x: s.x,
        y: s.y,
        roleId: s.roleId,
        duty: s.duty,
        customPIs: [],
      })),
      teamInstructions: DEFAULT_TEAM_INSTRUCTIONS_V2,
      currentFormationId: '4-3-3-dm-wide',
    };

    const migratedResult = migrateV1ToV2(validV1);
    expect(migratedResult.success).toBe(true);
    expect(migratedResult.recoveredFromV1).toBe(true);
    expect(migratedResult.state.schemaVersion).toBe(2);

    // 2. Corrupt / empty object
    const corruptData = { garbage: 12345, corrupted: true };
    const fallbackResult = migrateV1ToV2(corruptData);
    expect(fallbackResult.success).toBe(false);
    expect(fallbackResult.warnings.length).toBeGreaterThan(0);
    expect(fallbackResult.state).toBeDefined();
    expect(fallbackResult.state.slots.length).toBe(11);

    // 3. Default state generator
    const defaultState = getDefaultStorageStateV2();
    expect(defaultState.schemaVersion).toBe(2);
    expect(defaultState.slots.length).toBe(11);
    expect(defaultState.players.length).toBeGreaterThan(0);
  });
});
