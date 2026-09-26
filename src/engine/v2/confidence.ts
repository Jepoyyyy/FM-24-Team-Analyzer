import { PlayerV2, RoleDutyProfile, DataCompletenessReport, FAMILIARITY_MULTIPLIER_V2, PositionalFamiliarityV2 } from './types';
import { Position } from '../../types';

export function getFamiliarityMultiplierV2(familiarity?: PositionalFamiliarityV2): number {
  if (!familiarity) return FAMILIARITY_MULTIPLIER_V2.Unknown;
  return FAMILIARITY_MULTIPLIER_V2[familiarity] ?? FAMILIARITY_MULTIPLIER_V2.Unknown;
}

export function evaluateDataCompleteness(
  player: PlayerV2,
  keyAttrs: string[],
  desirableAttrs: string[]
): DataCompletenessReport {
  const expectedAttrs = Array.from(new Set([...keyAttrs, ...desirableAttrs]));
  let knownCount = 0;
  const missingKey: string[] = [];

  for (const attr of expectedAttrs) {
    const val = player.attributes[attr];
    if (val !== undefined && typeof val === 'number' && !isNaN(val)) {
      knownCount++;
    } else if (keyAttrs.includes(attr)) {
      missingKey.push(attr);
    }
  }

  const completenessScore = expectedAttrs.length > 0
    ? Math.round((knownCount / expectedAttrs.length) * 100)
    : 100;

  // Confidence starts at completeness score, with extra penalty for missing KEY attributes
  const keyAttrCompleteness = keyAttrs.length > 0
    ? (keyAttrs.length - missingKey.length) / keyAttrs.length
    : 1.0;

  const dataConfidence = Math.round(completenessScore * 0.6 + keyAttrCompleteness * 100 * 0.4);

  return {
    totalAttributesExpected: expectedAttrs.length,
    knownAttributesCount: knownCount,
    completenessScore,
    missingKeyAttributes: missingKey,
    dataConfidence,
  };
}

export function calculateDataCompletenessReport(
  slots: { slotId: string; roleId: string; duty: string; assignedPlayerId?: string }[],
  players?: Record<string, PlayerV2 | { attributes?: Record<string, number> }>
): DataCompletenessReport {
  if (!players || Object.keys(players).length === 0) {
    return {
      totalAttributesExpected: 0,
      knownAttributesCount: 0,
      completenessScore: 100,
      missingKeyAttributes: [],
      dataConfidence: 100,
    };
  }

  const assignedSlots = slots.filter(s => s.assignedPlayerId && players[s.assignedPlayerId]);
  if (assignedSlots.length === 0) {
    return {
      totalAttributesExpected: 0,
      knownAttributesCount: 0,
      completenessScore: 100,
      missingKeyAttributes: [],
      dataConfidence: 100,
    };
  }

  let totalExpected = 0;
  let totalKnown = 0;
  const missingKeySet = new Set<string>();

  for (const s of assignedSlots) {
    const player = players[s.assignedPlayerId!];
    if (!player || !player.attributes) continue;
    // Known attributes on player
    const keys = Object.keys(player.attributes);
    totalKnown += keys.length;
    // We expect standard FM24 ~36 attributes
    totalExpected += Math.max(36, keys.length);
  }

  const completenessScore = totalExpected > 0 ? Math.round((totalKnown / totalExpected) * 100) : 100;
  const dataConfidence = Math.max(10, Math.min(100, completenessScore));

  return {
    totalAttributesExpected: totalExpected,
    knownAttributesCount: totalKnown,
    completenessScore,
    missingKeyAttributes: Array.from(missingKeySet),
    dataConfidence,
  };
}


export interface SuitabilityV2Result {
  rawAttributeFit: number; // 0-100
  positionalFamiliarity: PositionalFamiliarityV2;
  familiarityMultiplier: number;
  dataCompleteness: DataCompletenessReport;
  finalScore: number; // 0-100
  confidence: number; // 0-100
  positiveFactors: string[];
  negativeFactors: string[];
}

export function calculateRoleDutySuitabilityV2(
  player: PlayerV2,
  profile: RoleDutyProfile,
  position: Position
): SuitabilityV2Result {
  const completeness = evaluateDataCompleteness(
    player,
    profile.keyAttributes,
    profile.desirableAttributes
  );

  const posEntry = player.positions.find(p => p.position === position);
  const familiarity: PositionalFamiliarityV2 = posEntry ? posEntry.familiarity : 'Unknown';
  const familiarityMultiplier = getFamiliarityMultiplierV2(familiarity);

  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  // Key attributes (70% weight) - strictly missing is penalizing, not defaulted to 10
  let keySum = 0;
  let keyKnownCount = 0;
  for (const attr of profile.keyAttributes) {
    const val = player.attributes[attr];
    if (val !== undefined && typeof val === 'number') {
      keySum += val;
      keyKnownCount++;
      if (val >= 15) {
        positiveFactors.push(`${attr} unggul (${val}/20)`);
      } else if (val <= 9) {
        negativeFactors.push(`${attr} rendah (${val}/20)`);
      }
    }
  }

  // Desirable attributes (30% weight)
  let desSum = 0;
  let desKnownCount = 0;
  for (const attr of profile.desirableAttributes) {
    const val = player.attributes[attr];
    if (val !== undefined && typeof val === 'number') {
      desSum += val;
      desKnownCount++;
      if (val >= 16) {
        positiveFactors.push(`${attr} sangat baik (${val}/20)`);
      }
    }
  }

  // Average scaled to 0-100
  const avgKey = profile.keyAttributes.length > 0 && keyKnownCount > 0
    ? (keySum / profile.keyAttributes.length) / 20 * 100
    : 0;

  const avgDes = profile.desirableAttributes.length > 0 && desKnownCount > 0
    ? (desSum / profile.desirableAttributes.length) / 20 * 100
    : 0;

  const rawAttributeFit = Math.round(avgKey * 0.7 + avgDes * 0.3);

  // Missing data penalty: If 50% data missing, fit is tempered by confidence
  const missingDataMultiplier = 0.5 + (completeness.dataConfidence / 100) * 0.5;

  const finalScore = Math.round(
    rawAttributeFit * familiarityMultiplier * missingDataMultiplier
  );

  if (familiarity !== 'Natural' && familiarity !== 'Accomplished') {
    negativeFactors.push(`Familiaritas posisi: ${familiarity} (${Math.round(familiarityMultiplier * 100)}%)`);
  }

  if (completeness.missingKeyAttributes.length > 0) {
    negativeFactors.push(`Atribut kunci belum lengkap: ${completeness.missingKeyAttributes.join(', ')}`);
  }

  return {
    rawAttributeFit,
    positionalFamiliarity: familiarity,
    familiarityMultiplier,
    dataCompleteness: completeness,
    finalScore: Math.min(100, Math.max(0, finalScore)),
    confidence: completeness.dataConfidence,
    positiveFactors,
    negativeFactors,
  };
}
