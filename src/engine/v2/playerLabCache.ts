import { TeamInstructions } from '../../types';
import { hashStringDeterministic } from './snapshot';
import { PlayerLabCacheV2, StorageStateV2 } from './types';

/** Increment only when a Player Lab result's scoring/shape contract changes. */
export const PLAYER_LAB_MODEL_VERSION = 'player-lab-1.2.0';

type TacticSlotForFingerprint = Pick<StorageStateV2['slots'][number], 'slotId' | 'position' | 'roleId' | 'duty' | 'customPIs'>;

// These are the only team-instruction values consumed by behaviorDemand() in
// playerLabEvaluation. Keeping this list explicit prevents unrelated UI state
// (for example goalkeeper distribution) from creating a false cache miss.
const RELEVANT_TEAM_INSTRUCTION_KEYS = [
  'mentality', 'attackingWidth', 'tempo', 'passingDirectness', 'passIntoSpace',
  'creativeFreedom', 'overlapLeft', 'overlapRight', 'earlyCrosses',
  'whenLostPossession', 'whenWonPossession', 'defensiveLine', 'pressingIntensity',
] as const satisfies readonly (keyof TeamInstructions)[];

const RELEVANT_CUSTOM_PIS = new Set([
  'mark_tighter', 'close_down_more', 'close_down_less', 'take_more_risks',
  'fewer_risky_passes', 'get_further_forward', 'hold_position', 'drop_deeper',
  'shoot_more_often', 'shoot_less_often', 'stay_wider', 'run_wide_with_ball',
  'sit_narrower', 'cut_inside_with_ball', 'cross_more_often', 'cross_less_often',
]);

function stableTeamInstructions(instructions: TeamInstructions): Record<string, TeamInstructions[keyof TeamInstructions]> {
  return [...RELEVANT_TEAM_INSTRUCTION_KEYS]
    .sort()
    .reduce<Record<string, TeamInstructions[keyof TeamInstructions]>>((result, key) => {
      result[key] = instructions[key];
      return result;
    }, {});
}

/**
 * Fingerprints only inputs that Player Lab scoring can observe. Assignment, simulation data,
 * timestamps and the source array order are intentionally excluded.
 */
export function createTacticFingerprint(
  formationId: string,
  slots: readonly TacticSlotForFingerprint[],
  teamInstructions: TeamInstructions,
): string {
  const normalizedSlots = slots
    .map(slot => ({
      slotId: slot.slotId,
      position: slot.position,
      roleId: slot.roleId,
      duty: slot.duty,
      customPIs: slot.customPIs.filter(pi => RELEVANT_CUSTOM_PIS.has(pi)).sort(),
    }))
    .sort((left, right) =>
      left.slotId.localeCompare(right.slotId)
      || left.position.localeCompare(right.position)
      || left.roleId.localeCompare(right.roleId)
      || left.duty.localeCompare(right.duty),
    );

  return hashStringDeterministic(JSON.stringify({
    formationId,
    slots: normalizedSlots,
    teamInstructions: stableTeamInstructions(teamInstructions),
  }));
}

export function createPlayerLabCacheKey(
  snapshotId: string,
  tacticFingerprint: string,
  modelVersion = PLAYER_LAB_MODEL_VERSION,
): string {
  return hashStringDeterministic(JSON.stringify({ snapshotId, tacticFingerprint, modelVersion }));
}

export function readPlayerLabCache(
  state: Pick<StorageStateV2, 'snapshotId' | 'playerLabCache'>,
  tacticFingerprint: string,
  modelVersion = PLAYER_LAB_MODEL_VERSION,
): PlayerLabCacheV2 | undefined {
  const cache = state.playerLabCache;
  if (!cache) return undefined;
  const cacheKey = createPlayerLabCacheKey(state.snapshotId, tacticFingerprint, modelVersion);
  return cache.snapshotId === state.snapshotId
    && cache.tacticFingerprint === tacticFingerprint
    && cache.modelVersion === modelVersion
    && cache.cacheKey === cacheKey
    ? cache
    : undefined;
}

export function writePlayerLabCache(
  state: StorageStateV2,
  tacticFingerprint: string,
  result: unknown,
  modelVersion = PLAYER_LAB_MODEL_VERSION,
): StorageStateV2 {
  const cache: PlayerLabCacheV2 = {
    snapshotId: state.snapshotId,
    tacticFingerprint,
    modelVersion,
    cacheKey: createPlayerLabCacheKey(state.snapshotId, tacticFingerprint, modelVersion),
    result,
  };
  return { ...state, playerLabCache: cache };
}

/** Pure invalidation for tactic/squad edits; this intentionally never invokes evaluation. */
export function invalidatePlayerLabCache(state: StorageStateV2): StorageStateV2 {
  return state.playerLabCache ? { ...state, playerLabCache: undefined } : state;
}
