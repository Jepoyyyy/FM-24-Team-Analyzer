import { Player, RoleDefinition, Position } from '../types';

export interface SuitabilityResult {
  roleId: string;
  roleName: string;
  score: number; // 0 - 100
  stars: number; // 0 - 5 (bisa pecahan misal 4.5)
  familiarityMultiplier: number;
  keyScoreAvg: number;
  desirableScoreAvg: number;
}

export function getFamiliarityMultiplier(
  player: Player,
  position: Position
): number {
  const posEntry = player.positions.find(p => p.position === position);
  if (!posEntry) return 0.40; // Awkward jika tidak terdaftar sama sekali

  switch (posEntry.familiarity) {
    case 'Natural':
      return 1.00;
    case 'Accomplished':
      return 0.85;
    case 'Unconvincing':
      return 0.65;
    case 'Awkward':
    default:
      return 0.40;
  }
}

export function calculateRoleSuitability(
  player: Player,
  role: RoleDefinition,
  position: Position
): SuitabilityResult {
  const keyWeights = 3;
  const desWeights = 1;

  let keyTotal = 0;
  let desTotal = 0;

  for (const attr of role.keyAttributes) {
    const val = player.attributes[attr] ?? 10;
    keyTotal += val * keyWeights;
  }

  for (const attr of role.desirableAttributes) {
    const val = player.attributes[attr] ?? 10;
    desTotal += val * desWeights;
  }

  const maxKeyScore = role.keyAttributes.length * keyWeights * 20;
  const maxDesScore = role.desirableAttributes.length * desWeights * 20;
  const maxTotal = maxKeyScore + maxDesScore;

  const rawScore = maxTotal > 0 ? (keyTotal + desTotal) / maxTotal : 0.5;
  const multiplier = getFamiliarityMultiplier(player, position);

  const finalScore = Math.round(rawScore * multiplier * 100);

  // Hitung bintang (0 - 5 bintang)
  const stars = Math.min(5, Math.max(0.5, Math.round((finalScore / 20) * 2) / 2));

  return {
    roleId: role.id,
    roleName: role.name,
    score: Math.min(100, Math.max(1, finalScore)),
    stars,
    familiarityMultiplier: multiplier,
    keyScoreAvg: role.keyAttributes.length > 0 ? Math.round((keyTotal / (role.keyAttributes.length * keyWeights)) * 10) / 10 : 10,
    desirableScoreAvg: role.desirableAttributes.length > 0 ? Math.round((desTotal / (role.desirableAttributes.length * desWeights)) * 10) / 10 : 10,
  };
}
