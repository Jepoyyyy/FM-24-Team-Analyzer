// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEMO_SQUADS } from '../data/demoSquads';
import { FORMATION_TEMPLATES } from '../engine/formations';
import {
  commitImportedSnapshot,
  getDefaultStorageStateV2,
  loadTacticalStorageV2,
  migrateStoredStateV2,
  migrateV1ToV2,
  STORAGE_KEY_V1,
  STORAGE_KEY_V2,
} from '../engine/v2/persistence';
import {
  createPlayerLabCacheKey,
  createTacticFingerprint,
  readPlayerLabCache,
  writePlayerLabCache,
} from '../engine/v2/playerLabCache';
import { DEFAULT_TEAM_INSTRUCTIONS } from '../types';

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('Player Lab persistence and lazy cache', () => {
  it('gives each built-in preset a stable, distinct demo snapshot identity', () => {
    const base = getDefaultStorageStateV2();
    const ids = DEMO_SQUADS.map(squad => migrateStoredStateV2({
      schemaVersion: 2, squadName: squad.name, players: squad.players, currentFormationId: base.currentFormationId,
      slots: base.slots, teamInstructions: base.teamInstructions,
    }).state.snapshotId);
    expect(ids).toEqual(DEMO_SQUADS.map(squad => `demo:${squad.id}`));
    expect(new Set(ids).size).toBe(3);
  });

  it('migrates legacy v1 and v2-shaped tactics while retaining formation, slots, and instructions', () => {
    const template = FORMATION_TEMPLATES[0];
    const legacy = { squadName: DEMO_SQUADS[1].name, currentFormationId: template.id, slots: template.slots.map(slot => ({ ...slot, customPIs: [] })), teamInstructions: { ...DEFAULT_TEAM_INSTRUCTIONS, mentality: 'attacking' }, savedAt: 100 };
    const v1 = migrateV1ToV2(legacy);
    expect(v1.success).toBe(true);
    expect(v1.state.currentFormationId).toBe(template.id);
    expect(v1.state.teamInstructions.mentality).toBe('attacking');
    expect(v1.state.snapshotId).toBe(`demo:${DEMO_SQUADS[1].id}`);
    const v2 = migrateStoredStateV2({ ...legacy, schemaVersion: 2, players: DEMO_SQUADS[2].players });
    expect(v2.success).toBe(true);
    expect(v2.state.players).toHaveLength(DEMO_SQUADS[2].players.length);
  });

  it('falls back safely from corrupt JSON and does not mutate prior storage when an import write fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY_V2, '{bad json');
    expect(loadTacticalStorageV2(storage).state.snapshotId).toBe('demo:london_red');
    const before = 'prior-valid-state';
    const failing = {
      getItem: (key: string) => { void key; return before; },
      setItem: (key: string, value: string) => { void key; void value; throw new Error('quota exceeded'); },
    };
    const current = getDefaultStorageStateV2();
    const payload = { snapshotId: 'import:abc', squadName: 'Imported', players: [DEMO_SQUADS[0].players[0]], report: { attributeRows: 1, performanceRows: 1, joinedRows: 1, uidMatches: 1, nameFallbackMatches: 0, unmatchedAttributeRows: 0, unmatchedPerformanceRows: 0, attributeHeaderCount: 1, performanceHeaderCount: 1, attributeCoverage: {}, performanceCoverage: {} } };
    const committed = commitImportedSnapshot(current, payload, failing);
    expect(committed.save.success).toBe(false);
    expect(failing.getItem(STORAGE_KEY_V2)).toBe(before);
    expect(current.snapshotId).toBe('demo:london_red');
  });

  it('round-trips imported performance metadata and discards an invalid persisted cache without discarding the tactic', () => {
    const storage = new MemoryStorage();
    const current = getDefaultStorageStateV2();
    const player = {
      ...DEMO_SQUADS[0].players[0],
      performance: {
        minutesPlayed: 270,
        appearances: 3,
        starts: 3,
        substituteAppearances: 0,
        averageRating: 7.1,
        metrics: { savePercentage: 72.4 },
        importedHeaders: ['Mins', 'Sv %'],
        minutesKind: 'total_minutes_proxy' as const,
      },
      importedIdentity: { uid: 'fm-123', normalizedName: 'david raya', sourceRow: 2 },
    };
    const report = { attributeRows: 1, performanceRows: 1, joinedRows: 1, uidMatches: 1, nameFallbackMatches: 0, unmatchedAttributeRows: 0, unmatchedPerformanceRows: 0, attributeHeaderCount: 2, performanceHeaderCount: 2, attributeCoverage: { reflexes: 1 }, performanceCoverage: { savePercentage: 1 } };
    const committed = commitImportedSnapshot(current, { snapshotId: 'import:fm-123', squadName: 'Imported', players: [player], report }, storage);
    expect(committed.save.success).toBe(true);
    report.attributeCoverage.reflexes = 0;
    const loaded = loadTacticalStorageV2(storage).state;
    expect(loaded.squadSource).toMatchObject({ kind: 'imported', importId: 'import:fm-123' });
    expect(loaded.players[0].performance?.metrics.savePercentage).toBe(72.4);
    expect((loaded.squadSource.kind === 'imported' ? loaded.squadSource.report?.attributeCoverage.reflexes : undefined)).toBe(1);

    storage.setItem(STORAGE_KEY_V2, JSON.stringify({ ...loaded, playerLabCache: { snapshotId: 1 } }));
    expect(loadTacticalStorageV2(storage).state.playerLabCache).toBeUndefined();
  });

  it('uses only formation, relevant slots/PIs, and team instructions in a stable tactic fingerprint', () => {
    const state = getDefaultStorageStateV2();
    const ordered = createTacticFingerprint(state.currentFormationId, state.slots, state.teamInstructions);
    const reordered = createTacticFingerprint(state.currentFormationId, [...state.slots].reverse(), { ...state.teamInstructions });
    const reassigned = createTacticFingerprint(state.currentFormationId, state.slots.map(slot => ({ ...slot, assignedPlayerId: 'different' })), state.teamInstructions);
    expect(reordered).toBe(ordered);
    expect(reassigned).toBe(ordered);
    expect(createTacticFingerprint('other-formation', state.slots, state.teamInstructions)).not.toBe(ordered);
    expect(createTacticFingerprint(state.currentFormationId, [{ ...state.slots[0], duty: 'Attack' }, ...state.slots.slice(1)], state.teamInstructions)).not.toBe(ordered);
    expect(createTacticFingerprint(state.currentFormationId, state.slots, { ...state.teamInstructions, mentality: 'balanced' })).not.toBe(ordered);
    expect(createTacticFingerprint(state.currentFormationId, state.slots, { ...state.teamInstructions, gkDistributionType: 'long_kicks' })).toBe(ordered);
    expect(createTacticFingerprint(state.currentFormationId, [{ ...state.slots[0], customPIs: ['cross_aim_near_post'] }, ...state.slots.slice(1)], state.teamInstructions)).toBe(ordered);
  });

  it('hits the Player Lab cache only when snapshot, tactic fingerprint, and model version all match', () => {
    const state = getDefaultStorageStateV2();
    const fingerprint = createTacticFingerprint(state.currentFormationId, state.slots, state.teamInstructions);
    const cached = writePlayerLabCache(state, fingerprint, { natural: [] }, 'model-a');
    expect(readPlayerLabCache(cached, fingerprint, 'model-a')?.result).toEqual({ natural: [] });
    expect(readPlayerLabCache({ ...cached, snapshotId: 'demo:other' }, fingerprint, 'model-a')).toBeUndefined();
    expect(readPlayerLabCache(cached, 'changed', 'model-a')).toBeUndefined();
    expect(readPlayerLabCache(cached, fingerprint, 'model-b')).toBeUndefined();
    expect(cached.playerLabCache?.cacheKey).toBe(createPlayerLabCacheKey(state.snapshotId, fingerprint, 'model-a'));
  });

  it('migrates valid v1 storage through the guarded load API without touching the v1 backup', () => {
    const storage = new MemoryStorage();
    const state = getDefaultStorageStateV2();
    storage.setItem(STORAGE_KEY_V1, JSON.stringify({ squadName: state.squadName, currentFormationId: state.currentFormationId, slots: state.slots, teamInstructions: state.teamInstructions }));
    const loaded = loadTacticalStorageV2(storage);
    expect(loaded.state.snapshotId).toBe('demo:london_red');
    expect(storage.getItem(STORAGE_KEY_V1)).not.toBeNull();
    expect(storage.getItem(STORAGE_KEY_V2)).not.toBeNull();
  });
});
