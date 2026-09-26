import { SimulationSnapshotV2 } from './types';
import { TeamInstructions } from '../../types';

export const ENGINE_VERSION_V2 = '2.0.0-rc1';

/**
 * FNV-1a 64-bit deterministic hash implementation in pure TypeScript.
 * Stable across all environments (Node, Bun, browser Web Worker).
 */
export function hashStringDeterministic(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x01000193);
  }

  // Convert to 16-character hex string
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

export function createSimulationSnapshot(
  formationId: string,
  slots: SimulationSnapshotV2['slots'],
  teamInstructions: TeamInstructions,
  playersMap?: Map<string, { attributes: Record<string, number | undefined> }>
): SimulationSnapshotV2 {
  // Normalize slots deterministically sorted by slotId
  const normalizedSlots = slots
    .map(s => ({
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleId: s.roleId,
      duty: s.duty,
      assignedPlayerId: s.assignedPlayerId,
      customPIs: [...s.customPIs].sort(),
    }))
    .sort((a, b) => a.slotId.localeCompare(b.slotId));

  // Build compact attributes digest for assigned players
  const playerAttributesDigest: Record<string, Record<string, number | undefined>> = {};
  if (playersMap) {
    for (const slot of normalizedSlots) {
      if (slot.assignedPlayerId) {
        const p = playersMap.get(slot.assignedPlayerId);
        if (p) {
          playerAttributesDigest[slot.assignedPlayerId] = p.attributes;
        }
      }
    }
  }

  // Deterministic serialization string
  const hashPayload = JSON.stringify({
    v: ENGINE_VERSION_V2,
    f: formationId,
    s: normalizedSlots,
    ti: teamInstructions,
    p: playerAttributesDigest,
  });

  const hash = hashStringDeterministic(hashPayload);

  return {
    schemaVersion: 2,
    hash,
    engineVersion: ENGINE_VERSION_V2,
    timestamp: Date.now(),
    formationId,
    slots: normalizedSlots,
    teamInstructions,
    playerAttributesDigest,
  };
}

export function isSnapshotStale(
  currentSnapshot: SimulationSnapshotV2,
  previousSnapshot?: SimulationSnapshotV2
): boolean {
  if (!previousSnapshot) return true;
  return currentSnapshot.hash !== previousSnapshot.hash;
}
