import { TacticSlot, Position, Player } from '../../types';
import { PlayerV2, PositionalFamiliarityV2 } from './types';
import { getRoleDutyProfile } from './roleDutyProfiles';
import { calculateRoleDutySuitabilityV2, getFamiliarityMultiplierV2 } from './confidence';

export interface PlayerSlotScore {
  playerId: string;
  slotId: string;
  totalScore: number; // 0 - 100
  roleDutyFit: number; // 0 - 100
  familiarityScore: number; // 0 - 100
  traitScore: number; // 0 - 100
  physicalScore: number; // 0 - 100
  isEmergency: boolean;
}

export interface OptimizedAssignmentResult {
  assignedSlots: TacticSlot[];
  totalTeamFitScore: number; // 0 - 100
  averagePlayerFit: number; // 0 - 100
  unassignedPlayerIds: string[];
  emergencySlotIds: string[];
  scoreBreakdown: Record<string, PlayerSlotScore>; // slotId -> PlayerSlotScore
}

/**
 * Solves rectangular minimum cost bipartite matching using Hungarian (Kuhn-Munkres) algorithm.
 * Rows = slots (M), Columns = players (N), where M <= N.
 * Returns array of length M, where result[i] is the column (player index) assigned to row i.
 */
export function solveMunkresRectangular(costMatrix: number[][]): number[] {
  const m = costMatrix.length; // slots (rows)
  if (m === 0) return [];
  const n = costMatrix[0].length; // players (cols)
  if (n < m) {
    throw new Error(`Hungarian solver requires at least as many candidates (${n}) as slots (${m})`);
  }

  // 1-based indexing for standard augmenting path
  const u = new Array(m + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0); // p[j] = row (1..m) matched to col j
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity);
    const used = new Array(n + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // Build mapping: slotIndex (0..m-1) -> playerIndex (0..n-1)
  const slotToPlayer = new Array(m).fill(-1);
  for (let j = 1; j <= n; j++) {
    if (p[j] > 0 && p[j] <= m) {
      slotToPlayer[p[j] - 1] = j - 1;
    }
  }

  return slotToPlayer;
}

/**
 * Evaluates effective player rating for a slot according to documented spec:
 * 70% role-duty fit + 15% positional familiarity + 10% trait compatibility + 5% physical sustainability.
 */
export function calculatePlayerSlotFit(
  player: PlayerV2 | Player,
  slot: TacticSlot
): PlayerSlotScore {
  const profile = getRoleDutyProfile(slot.roleId, slot.duty);
  const position: Position = slot.position;

  // Adapt player to PlayerV2 format if legacy
  const playerV2: PlayerV2 = {
    id: player.id,
    name: player.name,
    positions: player.positions.map(p => ({
      position: p.position,
      familiarity: (p.familiarity as PositionalFamiliarityV2) || 'Competent',
    })),
    attributes: player.attributes,
    traits: player.traits ?? [],
  };

  const posEntry = playerV2.positions.find(p => p.position === position);
  const familiarity: PositionalFamiliarityV2 = posEntry ? posEntry.familiarity : 'Unknown';
  const familiarityMultiplier = getFamiliarityMultiplierV2(familiarity);
  const familiarityScore = Math.round(familiarityMultiplier * 100);

  let roleDutyFit = 40;
  if (profile) {
    const suit = calculateRoleDutySuitabilityV2(playerV2, profile, position);
    roleDutyFit = suit.rawAttributeFit;
  }

  // Trait compatibility (10% weight)
  let traitScore = 65;
  const traits = playerV2.traits || [];
  if (traits.length > 0) {
    let positiveTraits = 0;
    for (const t of traits) {
      const lower = t.toLowerCase();
      if (
        (slot.duty === 'Attack' && (lower.includes('forward') || lower.includes('box') || lower.includes('space') || lower.includes('shots'))) ||
        (slot.duty === 'Defend' && (lower.includes('simple') || lower.includes('position') || lower.includes('dive') || lower.includes('stay'))) ||
        (['dlp', 'ap', 'regista'].includes(slot.roleId) && (lower.includes('tempo') || lower.includes('killer') || lower.includes('switch')))
      ) {
        positiveTraits++;
      }
    }
    traitScore = Math.min(100, 60 + positiveTraits * 15);
  }

  // Physical sustainability (5% weight)
  const stamina = typeof playerV2.attributes.Stamina === 'number' ? playerV2.attributes.Stamina : 11;
  const naturalFitness = typeof playerV2.attributes.NaturalFitness === 'number' ? playerV2.attributes.NaturalFitness : 11;
  const physicalScore = Math.min(100, Math.round(((stamina + naturalFitness) / 2) * 5));

  // Weighted sum
  const weighted =
    roleDutyFit * 0.70 +
    familiarityScore * 0.15 +
    traitScore * 0.10 +
    physicalScore * 0.05;

  const totalScore = Math.max(0, Math.min(100, Math.round(weighted)));
  const isEmergency = familiarityMultiplier <= 0.25 || totalScore < 30;

  return {
    playerId: player.id,
    slotId: slot.slotId,
    totalScore,
    roleDutyFit,
    familiarityScore,
    traitScore,
    physicalScore,
    isEmergency,
  };
}

/**
 * Optimizes squad assignment globally using the Hungarian algorithm.
 * Guarantees globally optimal role/position fit without greedy traps.
 * Respects locked slots.
 */
export function optimizeSquadAssignmentV2(
  slots: TacticSlot[],
  players: (PlayerV2 | Player)[],
  lockedSlotIds: string[] = []
): OptimizedAssignmentResult {
  if (slots.length === 0 || players.length === 0) {
    return {
      assignedSlots: slots,
      totalTeamFitScore: 0,
      averagePlayerFit: 0,
      unassignedPlayerIds: players.map(p => p.id),
      emergencySlotIds: [],
      scoreBreakdown: {},
    };
  }

  const assignedSlots: TacticSlot[] = slots.map(s => ({ ...s }));
  const scoreBreakdown: Record<string, PlayerSlotScore> = {};
  const emergencySlotIds: string[] = [];
  const assignedPlayerIds = new Set<string>();

  // 1. Process manually locked slots first
  const slotsToOptimize: TacticSlot[] = [];
  for (const slot of assignedSlots) {
    if (lockedSlotIds.includes(slot.slotId) && slot.assignedPlayerId) {
      const lockedPlayer = players.find(p => p.id === slot.assignedPlayerId);
      if (lockedPlayer) {
        assignedPlayerIds.add(lockedPlayer.id);
        const fit = calculatePlayerSlotFit(lockedPlayer, slot);
        scoreBreakdown[slot.slotId] = fit;
        if (fit.isEmergency) emergencySlotIds.push(slot.slotId);
        continue;
      }
    }
    slotsToOptimize.push(slot);
  }

  // 2. Candidates available for Hungarian matching
  const availablePlayers = players.filter(p => !assignedPlayerIds.has(p.id));

  // If we have fewer available players than slots, pad dummy candidates
  const m = slotsToOptimize.length;
  const n = Math.max(m, availablePlayers.length);

  // 3. Build Cost Matrix for Hungarian solver
  // Hungarian minimizes cost, so cost = 1000 - score
  const costMatrix: number[][] = [];
  for (let i = 0; i < m; i++) {
    const slot = slotsToOptimize[i];
    const rowCosts: number[] = [];

    for (let j = 0; j < n; j++) {
      if (j < availablePlayers.length) {
        const player = availablePlayers[j];
        const fit = calculatePlayerSlotFit(player, slot);
        rowCosts.push(1000 - fit.totalScore);
      } else {
        // Dummy player penalty
        rowCosts.push(2000);
      }
    }
    costMatrix.push(rowCosts);
  }

  // 4. Solve globally using Munkres
  const matches = solveMunkresRectangular(costMatrix);

  // 5. Apply assignments
  let totalScoreSum = 0;
  let filledCount = 0;

  for (let i = 0; i < m; i++) {
    const slot = slotsToOptimize[i];
    const playerIdx = matches[i];

    if (playerIdx >= 0 && playerIdx < availablePlayers.length) {
      const assignedPlayer = availablePlayers[playerIdx];
      slot.assignedPlayerId = assignedPlayer.id;
      assignedPlayerIds.add(assignedPlayer.id);

      const fit = calculatePlayerSlotFit(assignedPlayer, slot);
      scoreBreakdown[slot.slotId] = fit;
      if (fit.isEmergency) {
        emergencySlotIds.push(slot.slotId);
      }
      totalScoreSum += fit.totalScore;
      filledCount++;
    } else {
      // Unfilled or dummy assignment
      slot.assignedPlayerId = undefined;
      emergencySlotIds.push(slot.slotId);
    }
  }

  // Also tally locked slots in score
  for (const slot of assignedSlots) {
    if (lockedSlotIds.includes(slot.slotId) && scoreBreakdown[slot.slotId]) {
      totalScoreSum += scoreBreakdown[slot.slotId].totalScore;
      filledCount++;
    }
  }

  const unassignedPlayerIds = players.filter(p => !assignedPlayerIds.has(p.id)).map(p => p.id);
  const averagePlayerFit = filledCount > 0 ? Math.round(totalScoreSum / filledCount) : 0;

  return {
    assignedSlots,
    totalTeamFitScore: averagePlayerFit,
    averagePlayerFit,
    unassignedPlayerIds,
    emergencySlotIds,
    scoreBreakdown,
  };
}
