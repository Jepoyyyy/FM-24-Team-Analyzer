import { DEFAULT_TEAM_INSTRUCTIONS, Duty, ImportReport, Player, PlayerInstructionType, Position, TeamInstructions } from '../../types';
import { DEMO_SQUADS } from '../../data/demoSquads';
import { FORMATION_TEMPLATES } from '../formations';
import { getRoleById } from '../roles';
import { hashStringDeterministic } from './snapshot';
import { PlayerV2, PositionalFamiliarityV2, SquadSourceV2, StorageStateV2 } from './types';

export const STORAGE_KEY_V1 = 'fm24_saved_tactic_v1';
export const STORAGE_KEY_V2 = 'fm24_saved_tactic_v2';
export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface MigrationResult { success: boolean; state: StorageStateV2; recoveredFromV1: boolean; warnings: string[]; errorMessage?: string; }
export interface StorageLoadResult { state: StorageStateV2; message?: string; warnings: string[]; }
export interface StorageSaveResult { success: boolean; errorMessage?: string; }
export interface ImportedSnapshotPayload { snapshotId: string; squadName: string; players: Player[]; report: ImportReport; }

const VALID_POSITIONS = new Set<string>(['GK', 'DR', 'DL', 'DC', 'WBR', 'WBL', 'DM', 'MC', 'MR', 'ML', 'AMC', 'AMR', 'AML', 'STC']);
const VALID_DUTIES = new Set<string>(['Defend', 'Support', 'Attack', 'Stopper', 'Cover', 'Automatic']);
const browserStorage = (): StorageAdapter | undefined => typeof window === 'undefined' ? undefined : window.localStorage;
const demoSnapshotId = (demoId: string) => `demo:${demoId}`;

function toPlayerV2(player: Player): PlayerV2 {
  return { id: player.id, name: player.name, age: player.age, club: player.club, nationality: player.nationality,
    positions: player.positions.map(position => ({ position: position.position, familiarity: position.familiarity as PositionalFamiliarityV2 })),
    attributes: { ...player.attributes }, traits: player.traits ? [...player.traits] : undefined,
    performance: player.performance ? { ...player.performance, metrics: { ...player.performance.metrics }, importedHeaders: [...player.performance.importedHeaders] } : undefined,
    importedIdentity: player.importedIdentity ? { ...player.importedIdentity } : undefined };
}

function normalizePerformance(raw: unknown): PlayerV2['performance'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const performance = raw as Record<string, unknown>;
  const nullableNumber = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const metrics = performance.metrics && typeof performance.metrics === 'object'
    ? Object.entries(performance.metrics as Record<string, unknown>).reduce<Record<string, number>>((result, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
      return result;
    }, {})
    : {};

  return {
    minutesPlayed: nullableNumber(performance.minutesPlayed),
    appearances: nullableNumber(performance.appearances),
    starts: nullableNumber(performance.starts),
    substituteAppearances: nullableNumber(performance.substituteAppearances),
    averageRating: nullableNumber(performance.averageRating),
    metrics,
    importedHeaders: Array.isArray(performance.importedHeaders)
      ? performance.importedHeaders.filter((header): header is string => typeof header === 'string')
      : [],
    minutesKind: performance.minutesKind === 'role_minutes' ? 'role_minutes' : 'total_minutes_proxy',
    appearanceSource: typeof performance.appearanceSource === 'string' ? performance.appearanceSource : undefined,
  };
}

function normalizePlayers(raw: unknown, fallbackName: string): PlayerV2[] {
  if (!Array.isArray(raw) || !raw.length) return (DEMO_SQUADS.find(squad => squad.name === fallbackName) ?? DEMO_SQUADS[0]).players.map(toPlayerV2);
  return raw.flatMap((item): PlayerV2[] => {
    if (!item || typeof item !== 'object') return [];
    const player = item as Record<string, unknown>;
    if (typeof player.id !== 'string' || typeof player.name !== 'string' || !Array.isArray(player.positions) || !player.attributes || typeof player.attributes !== 'object') return [];
    const positions = player.positions.flatMap((value): PlayerV2['positions'] => {
      if (!value || typeof value !== 'object') return [];
      const position = value as Record<string, unknown>;
      return typeof position.position === 'string' && VALID_POSITIONS.has(position.position)
        ? [{ position: position.position as Position, familiarity: typeof position.familiarity === 'string' ? position.familiarity as PositionalFamiliarityV2 : 'Unknown' }] : [];
    });
    if (!positions.length) return [];
    return [{ id: player.id, name: player.name, age: typeof player.age === 'number' ? player.age : undefined, club: typeof player.club === 'string' ? player.club : undefined, nationality: typeof player.nationality === 'string' ? player.nationality : undefined, positions, attributes: { ...(player.attributes as Record<string, number | undefined>) }, traits: Array.isArray(player.traits) ? player.traits.filter((value): value is string => typeof value === 'string') : undefined, performance: normalizePerformance(player.performance), importedIdentity: player.importedIdentity as PlayerV2['importedIdentity'] }];
  });
}

function sourceForLegacy(squadName: string, players: readonly PlayerV2[]): SquadSourceV2 {
  const demo = DEMO_SQUADS.find(candidate => candidate.name === squadName);
  if (demo && !players.some(player => player.importedIdentity)) return { kind: 'demo', demoId: demo.id };
  return { kind: 'imported', importId: `legacy:${hashStringDeterministic(JSON.stringify(players.map(player => [player.id, player.name, player.importedIdentity?.uid ?? null])))}` };
}
function snapshotFor(source: SquadSourceV2, players: readonly PlayerV2[]) { return source.kind === 'demo' ? demoSnapshotId(source.demoId) : source.importId || `imported:${hashStringDeterministic(JSON.stringify(players.map(player => [player.id, player.importedIdentity?.uid ?? null])))}`; }

function normalizeSlots(raw: unknown, formationId: string, warnings: string[]): StorageStateV2['slots'] | undefined {
  if (!Array.isArray(raw) || raw.length !== 11) return undefined;
  const slots = raw.flatMap((item, index): StorageStateV2['slots'] => {
    if (!item || typeof item !== 'object') return [];
    const slot = item as Record<string, unknown>; const position = typeof slot.position === 'string' && VALID_POSITIONS.has(slot.position) ? slot.position as Position : 'MC';
    let roleId = typeof slot.roleId === 'string' ? slot.roleId : 'cm';
    if (!getRoleById(roleId)) { warnings.push(`Peran '${roleId}' pada posisi ${position} tidak dikenal, fallback ke peran standar.`); roleId = position === 'GK' ? 'gk' : position === 'DC' ? 'cd' : position === 'STC' ? 'af' : 'cm'; }
    return [{ slotId: typeof slot.slotId === 'string' ? slot.slotId : `${formationId}-slot-${index + 1}`, position, x: typeof slot.x === 'number' ? slot.x : 50, y: typeof slot.y === 'number' ? slot.y : 50, roleId, duty: typeof slot.duty === 'string' && VALID_DUTIES.has(slot.duty) ? slot.duty as Duty : 'Support', assignedPlayerId: typeof slot.assignedPlayerId === 'string' ? slot.assignedPlayerId : undefined, customPIs: Array.isArray(slot.customPIs) ? slot.customPIs.filter((pi): pi is PlayerInstructionType => typeof pi === 'string') : [] }];
  });
  return slots.length === 11 ? slots : undefined;
}

function normalizePlayerLabCache(raw: unknown): StorageStateV2['playerLabCache'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const cache = raw as Record<string, unknown>;
  if (typeof cache.snapshotId !== 'string' || typeof cache.tacticFingerprint !== 'string'
    || typeof cache.modelVersion !== 'string' || typeof cache.cacheKey !== 'string') return undefined;
  // Evaluation results are intentionally opaque here. Only retain JSON-serializable values so
  // an old/corrupt cache can never make an otherwise valid tactic save unloadable.
  try {
    JSON.stringify(cache.result);
  } catch {
    return undefined;
  }
  return {
    snapshotId: cache.snapshotId,
    tacticFingerprint: cache.tacticFingerprint,
    modelVersion: cache.modelVersion,
    cacheKey: cache.cacheKey,
    result: cache.result,
  };
}

function copyImportReport(report: ImportReport): ImportReport {
  return {
    ...report,
    attributeCoverage: { ...report.attributeCoverage },
    performanceCoverage: { ...report.performanceCoverage },
    attributeHeaderCoverage: report.attributeHeaderCoverage ? { ...report.attributeHeaderCoverage } : undefined,
    performanceHeaderCoverage: report.performanceHeaderCoverage ? { ...report.performanceHeaderCoverage } : undefined,
    duplicateHeaderOccurrences: report.duplicateHeaderOccurrences?.map(item => ({ ...item })),
  };
}

function normalizeStoredState(raw: unknown, recoveredFromV1: boolean): MigrationResult {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') return { success: false, state: getDefaultStorageStateV2(), recoveredFromV1: false, warnings: ['Data penyimpanan tidak berbentuk objek valid.'], errorMessage: 'Data penyimpanan kosong atau rusak.' };
  const data = raw as Record<string, unknown>; let formationId = typeof data.currentFormationId === 'string' ? data.currentFormationId : FORMATION_TEMPLATES[0].id;
  if (!FORMATION_TEMPLATES.some(template => template.id === formationId)) { warnings.push(`Formasi '${formationId}' tidak dikenal, fallback ke formasi default.`); formationId = FORMATION_TEMPLATES[0].id; }
  const slots = normalizeSlots(data.slots, formationId, warnings);
  if (!slots) return { success: false, state: getDefaultStorageStateV2(), recoveredFromV1: false, warnings: [...warnings, 'Data slot formasi tidak valid atau tidak lengkap.'], errorMessage: 'Struktur slot taktik tidak lengkap.' };
  const squadName = typeof data.squadName === 'string' ? data.squadName : DEMO_SQUADS[0].name; const players = normalizePlayers(data.players, squadName);
  if (!players.length) return { success: false, state: getDefaultStorageStateV2(), recoveredFromV1: false, warnings: [...warnings, 'Data pemain tidak valid.'], errorMessage: 'Daftar pemain tersimpan tidak dapat dipulihkan.' };
  const rawSource = data.squadSource as Record<string, unknown> | undefined;
  const source: SquadSourceV2 = rawSource?.kind === 'demo' && typeof rawSource.demoId === 'string' ? { kind: 'demo', demoId: rawSource.demoId } : rawSource?.kind === 'imported' && typeof rawSource.importId === 'string' ? { kind: 'imported', importId: rawSource.importId, report: rawSource.report as ImportReport | undefined } : sourceForLegacy(squadName, players);
  return { success: true, recoveredFromV1, warnings, state: { schemaVersion: 2, squadName, players, squadSource: source, snapshotId: typeof data.snapshotId === 'string' && data.snapshotId ? data.snapshotId : snapshotFor(source, players), currentFormationId: formationId, slots, teamInstructions: { ...DEFAULT_TEAM_INSTRUCTIONS, ...(data.teamInstructions && typeof data.teamInstructions === 'object' ? data.teamInstructions as Partial<TeamInstructions> : {}) }, lastSimulationSnapshot: data.lastSimulationSnapshot as StorageStateV2['lastSimulationSnapshot'], lastSimulationResult: data.lastSimulationResult as StorageStateV2['lastSimulationResult'], playerLabCache: normalizePlayerLabCache(data.playerLabCache), savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now() } };
}

export function getDefaultStorageStateV2(): StorageStateV2 {
  const squad = DEMO_SQUADS[0], template = FORMATION_TEMPLATES[0];
  return { schemaVersion: 2, squadName: squad.name, players: squad.players.map(toPlayerV2), squadSource: { kind: 'demo', demoId: squad.id }, snapshotId: demoSnapshotId(squad.id), currentFormationId: template.id, slots: template.slots.map(slot => ({ ...slot, customPIs: [] })), teamInstructions: { ...DEFAULT_TEAM_INSTRUCTIONS }, savedAt: Date.now() };
}

/** Migrates original v1 and prior v2-shaped saves into canonical state without losing tactics. */
export const migrateV1ToV2 = (rawV1: unknown): MigrationResult => normalizeStoredState(rawV1, true);
export const migrateStoredStateV2 = (rawV2: unknown): MigrationResult => normalizeStoredState(rawV2, false);

/** One guarded hydration API for the builder and Player Lab. */
export function loadTacticalStorageV2(storage = browserStorage()): StorageLoadResult {
  if (!storage) return { state: getDefaultStorageStateV2(), warnings: [] };
  try { const raw = storage.getItem(STORAGE_KEY_V2); if (raw) { const result = migrateStoredStateV2(JSON.parse(raw)); if (result.success) return { state: result.state, warnings: result.warnings, message: result.warnings.length ? 'Data taktik diperbarui ke format saat ini.' : undefined }; } } catch { /* try v1 */ }
  try { const raw = storage.getItem(STORAGE_KEY_V1); if (raw) { const result = migrateV1ToV2(JSON.parse(raw)); if (result.success) { const saved = saveTacticalStorageState(result.state, storage); return { state: result.state, warnings: saved.success ? result.warnings : [...result.warnings, saved.errorMessage ?? 'Migrasi tidak dapat ditulis.'], message: 'Berhasil memigrasikan data taktik dari v1 ke Tactical Engine v2!' }; } } } catch { /* default */ }
  return { state: getDefaultStorageStateV2(), warnings: ['Tidak ada data taktik tersimpan yang valid.'], message: 'Memuat formasi awal standar.' };
}

/** One guarded write; serialization precedes setItem, so a failure cannot partially replace prior storage. */
export function saveTacticalStorageState(state: StorageStateV2, storage = browserStorage()): StorageSaveResult {
  if (!storage) return { success: false, errorMessage: 'Browser storage tidak tersedia.' };
  try { const normalized = normalizeStoredState(state, false); if (!normalized.success) return { success: false, errorMessage: normalized.errorMessage }; storage.setItem(STORAGE_KEY_V2, JSON.stringify({ ...normalized.state, savedAt: state.savedAt })); return { success: true }; } catch (error) { return { success: false, errorMessage: error instanceof Error ? error.message : 'Gagal menyimpan taktik.' }; }
}
/** Compatibility wrapper for current callers. */
export const saveTacticalStorageV2 = (state: StorageStateV2, storage = browserStorage()): boolean => saveTacticalStorageState(state, storage).success;

/** Pure import confirmation transition: it invalidates metadata only and never invokes evaluation. */
export function createImportedSnapshotState(current: StorageStateV2, payload: ImportedSnapshotPayload): StorageStateV2 {
  return {
    ...current,
    squadName: payload.squadName,
    players: payload.players.map(toPlayerV2),
    squadSource: { kind: 'imported', importId: payload.snapshotId, report: copyImportReport(payload.report) },
    snapshotId: payload.snapshotId,
    playerLabCache: undefined,
  };
}
/** Atomic confirmation commit: exactly one write; failure leaves the previously stored value untouched. */
export function commitImportedSnapshot(current: StorageStateV2, payload: ImportedSnapshotPayload, storage = browserStorage()): { state: StorageStateV2; save: StorageSaveResult } { const state = createImportedSnapshotState(current, payload); return { state, save: saveTacticalStorageState(state, storage) }; }
