import { StorageStateV2, PlayerV2, PositionalFamiliarityV2 } from './types';
import { DEFAULT_TEAM_INSTRUCTIONS, Position, Duty, TeamInstructions, PlayerInstructionType } from '../../types';
import { FORMATION_TEMPLATES } from '../formations';
import { getRoleById } from '../roles';
import { DEMO_SQUADS } from '../../data/demoSquads';

export const STORAGE_KEY_V1 = 'fm24_saved_tactic_v1';
export const STORAGE_KEY_V2 = 'fm24_saved_tactic_v2';

export interface MigrationResult {
  success: boolean;
  state: StorageStateV2;
  recoveredFromV1: boolean;
  warnings: string[];
  errorMessage?: string;
}

export function getDefaultStorageStateV2(): StorageStateV2 {
  const defaultTemplate = FORMATION_TEMPLATES[0]; // 4-3-3 DM Wide
  const defaultSquad = DEMO_SQUADS[0]; // London Red

  const convertedPlayers: PlayerV2[] = defaultSquad.players.map(p => ({
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
  }));

  const slots = defaultTemplate.slots.map(s => ({
    slotId: s.slotId,
    position: s.position,
    x: s.x,
    y: s.y,
    roleId: s.roleId,
    duty: s.duty,
    customPIs: [],
  }));

  return {
    schemaVersion: 2,
    squadName: defaultSquad.name,
    players: convertedPlayers,
    currentFormationId: defaultTemplate.id,
    slots,
    teamInstructions: { ...DEFAULT_TEAM_INSTRUCTIONS },
    savedAt: Date.now(),
  };
}

const VALID_POSITIONS: Set<string> = new Set([
  'GK', 'DR', 'DL', 'DC', 'WBR', 'WBL', 'DM', 'MC', 'MR', 'ML', 'AMC', 'AMR', 'AML', 'STC',
]);

const VALID_DUTIES: Set<string> = new Set([
  'Defend', 'Support', 'Attack', 'Stopper', 'Cover', 'Automatic',
]);

/**
 * Migrates v1 storage data to v2 without corrupting or deleting v1.
 * Guarantees schema validity and provides graceful fallback.
 */
export function migrateV1ToV2(rawV1: unknown): MigrationResult {
  const warnings: string[] = [];

  if (!rawV1 || typeof rawV1 !== 'object') {
    return {
      success: false,
      state: getDefaultStorageStateV2(),
      recoveredFromV1: false,
      warnings: ['Data v1 tidak berbentuk objek valid.'],
      errorMessage: 'Data penyimpanan v1 kosong atau rusak.',
    };
  }

  try {
    const data = rawV1 as Record<string, unknown>;

    // 1. Formation resolution
    let formationId = typeof data.currentFormationId === 'string' ? data.currentFormationId : '433_dm_wide';
    let matchedTemplate = FORMATION_TEMPLATES.find(f => f.id === formationId);
    if (!matchedTemplate) {
      warnings.push(`Formasi '${formationId}' tidak dikenal, fallback ke 4-3-3 DM Wide.`);
      formationId = '433_dm_wide';
      matchedTemplate = FORMATION_TEMPLATES[0];
    }

    // 2. Slots validation & conversion
    if (!Array.isArray(data.slots) || data.slots.length === 0) {
      return {
        success: false,
        state: getDefaultStorageStateV2(),
        recoveredFromV1: false,
        warnings: ['Data slot formasi v1 tidak valid atau bukan array.'],
        errorMessage: 'Struktur slot formasi pada data tersimpan v1 rusak atau tidak ditemukan.',
      };
    }

    const rawSlots = data.slots;
    const convertedSlots: StorageStateV2['slots'] = [];

    for (const rawSlot of rawSlots) {
      if (!rawSlot || typeof rawSlot !== 'object') continue;
      const s = rawSlot as Record<string, unknown>;

      const slotId = typeof s.slotId === 'string' ? s.slotId : `slot_${Math.random().toString(36).slice(2, 7)}`;
      const position = typeof s.position === 'string' && VALID_POSITIONS.has(s.position)
        ? (s.position as Position)
        : 'MC';

      let roleId = typeof s.roleId === 'string' ? s.roleId : 'cm';
      if (!getRoleById(roleId)) {
        warnings.push(`Peran '${roleId}' pada posisi ${position} tidak dikenal, fallback ke peran standar.`);
        roleId = position === 'GK' ? 'gk' : position === 'DC' ? 'cd' : position === 'STC' ? 'af' : 'cm';
      }

      const duty = typeof s.duty === 'string' && VALID_DUTIES.has(s.duty)
        ? (s.duty as Duty)
        : 'Support';

      const customPIs = Array.isArray(s.customPIs)
        ? (s.customPIs.filter(pi => typeof pi === 'string') as PlayerInstructionType[])
        : [];

      convertedSlots.push({
        slotId,
        position,
        x: typeof s.x === 'number' ? s.x : 50,
        y: typeof s.y === 'number' ? s.y : 50,
        roleId,
        duty,
        assignedPlayerId: typeof s.assignedPlayerId === 'string' ? s.assignedPlayerId : undefined,
        customPIs,
      });
    }

    if (convertedSlots.length !== 11) {
      warnings.push(`Jumlah slot v1 (${convertedSlots.length}) tidak genap 11. Menggunakan slot template default.`);
      return {
        success: false,
        state: getDefaultStorageStateV2(),
        recoveredFromV1: false,
        warnings,
        errorMessage: 'Struktur slot taktik tidak lengkap.',
      };
    }

    // 3. Squad & Players validation
    const squadName = typeof data.squadName === 'string' ? data.squadName : DEMO_SQUADS[0].name;
    const matchedSquad = DEMO_SQUADS.find(sq => sq.name === squadName) || DEMO_SQUADS[0];

    const playersV2: PlayerV2[] = matchedSquad.players.map(p => {
      return {
        id: p.id,
        name: p.name,
        age: p.age,
        club: p.club,
        nationality: p.nationality,
        positions: p.positions.map(pos => ({
          position: pos.position,
          familiarity: (pos.familiarity as PositionalFamiliarityV2) || 'Unknown',
        })),
        attributes: { ...p.attributes },
        traits: p.traits,
      };
    });

    // 4. Instructions validation
    const teamInstructions: TeamInstructions = {
      ...DEFAULT_TEAM_INSTRUCTIONS,
      ...(data.teamInstructions && typeof data.teamInstructions === 'object'
        ? (data.teamInstructions as Partial<TeamInstructions>)
        : {}),
    };

    const stateV2: StorageStateV2 = {
      schemaVersion: 2,
      squadName,
      players: playersV2,
      currentFormationId: formationId,
      slots: convertedSlots,
      teamInstructions,
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
    };

    return {
      success: true,
      state: stateV2,
      recoveredFromV1: true,
      warnings,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Kesalahan saat parsing v1';
    return {
      success: false,
      state: getDefaultStorageStateV2(),
      recoveredFromV1: false,
      warnings: [errorMsg],
      errorMessage: 'Terjadi kegagalan fatal saat migrasi v1. Data dipulihkan ke preset default.',
    };
  }
}

/**
 * Loads storage data by checking v2 first, falling back to migrating v1.
 */
export function loadTacticalStorageV2(): { state: StorageStateV2; message?: string } {
  if (typeof window === 'undefined') {
    return { state: getDefaultStorageStateV2() };
  }

  // 1. Try reading v2
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (parsed && parsed.schemaVersion === 2 && Array.isArray(parsed.slots) && parsed.slots.length === 11) {
        return { state: parsed as StorageStateV2 };
      }
    }
  } catch (e) {
    console.warn('Gagal membaca data v2, mencoba migrasi dari v1...', e);
  }

  // 2. Try migrating v1
  try {
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      const result = migrateV1ToV2(parsedV1);
      if (result.success) {
        // Save the valid v2 state (v1 is untouched)
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(result.state));
        return {
          state: result.state,
          message: 'Berhasil memigrasikan data taktik dari v1 ke Tactical Engine v2!',
        };
      }
    }
  } catch (e) {
    console.error('Gagal migrasi data dari v1', e);
  }

  // 3. Fallback to default
  const defaultState = getDefaultStorageStateV2();
  return {
    state: defaultState,
    message: 'Memuat formasi awal standar.',
  };
}

export function saveTacticalStorageV2(state: StorageStateV2): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Gagal menyimpan taktik v2 ke storage', e);
    return false;
  }
}
