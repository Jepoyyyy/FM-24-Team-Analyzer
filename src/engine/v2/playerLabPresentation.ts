/**
 * UI-only identity and visibility rules for Player Lab candidate collections.
 * These deliberately live outside a React component so a natural and an
 * experimental evaluation for the same player can never be conflated.
 */
export interface PlayerLabCandidateIdentity {
  candidateType: 'natural' | 'experimental';
  playerId: string;
  bestSlot?: { slotId: string } | null;
}

export function playerLabCandidateKey(row: PlayerLabCandidateIdentity | undefined): string {
  return row ? JSON.stringify([row.candidateType, row.playerId, row.bestSlot?.slotId ?? null]) : '';
}

export function visiblePlayerLabRows<T>(natural: T[], experimental: T[], showExperimental: boolean): T[] {
  return showExperimental ? [...natural, ...experimental] : natural;
}
