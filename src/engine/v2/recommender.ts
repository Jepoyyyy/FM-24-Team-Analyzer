import { TacticSlot, TeamInstructions, Player, DEFAULT_TEAM_INSTRUCTIONS } from '../../types';
import {
  PlayerV2,
  SquadRecommendationV2,
  KeyPlayerSummaryV2,
  RecommendationDiffV2,
  AtomicApplyPayloadV2,
  TacticAnalysisV2,
} from './types';
import { FORMATION_TEMPLATES } from '../formations';
import { optimizeSquadAssignmentV2 } from './hungarian';
import { analyzeTacticV2 } from './analyzer';
import { getRoleDutyProfile } from './roleDutyProfiles';

interface PresetBlueprint {
  presetId: string;
  presetName: string;
  formationTemplateId: string;
  formationShape: string;
  instructions: Partial<TeamInstructions>;
  roleVariants: Array<{
    slotId: string;
    roleId: string;
    duty: 'Defend' | 'Support' | 'Attack' | 'Stopper' | 'Cover';
  }>;
}

const PRESET_BLUEPRINTS: PresetBlueprint[] = [
  // 1. Gegenpress 4-2-3-1 DM
  {
    presetId: 'gegenpress_4231',
    presetName: 'Modern Gegenpress 4-2-3-1',
    formationTemplateId: '4231_dm_wide',
    formationShape: '4-2-3-1',
    instructions: {
      mentality: 'positive',
      tempo: 'higher',
      passingDirectness: 'shorter',
      lineOfEngagement: 'high_press',
      defensiveLine: 'higher',
      pressingIntensity: 'more_often',
      preventShortGkDistribution: true,
      whenLostPossession: 'counter_press',
      whenWonPossession: 'counter',
      playOutOfDefence: true,
      workBallIntoBox: true,
    },
    roleVariants: [
      { slotId: 'gk', roleId: 'sk', duty: 'Support' },
      { slotId: 'dr', roleId: 'ifb', duty: 'Defend' }, // 3+2 rest defence
      { slotId: 'dcr', roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dcl', roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', roleId: 'wb', duty: 'Attack' },
      { slotId: 'dmr', roleId: 'dlp', duty: 'Support' },
      { slotId: 'dml', roleId: 'anchor', duty: 'Defend' },
      { slotId: 'amr', roleId: 'w', duty: 'Attack' },
      { slotId: 'amc', roleId: 'ap', duty: 'Support' },
      { slotId: 'aml', roleId: 'inside_forward', duty: 'Attack' },
      { slotId: 'stc', roleId: 'af', duty: 'Attack' },
    ],
  },
  // 2. Control Possession 4-3-3 DM Wide
  {
    presetId: 'control_possession_433',
    presetName: 'Control Possession 4-3-3',
    formationTemplateId: '433_dm_wide',
    formationShape: '4-3-3',
    instructions: {
      mentality: 'positive',
      tempo: 'lower',
      passingDirectness: 'shorter',
      lineOfEngagement: 'high_press',
      defensiveLine: 'higher',
      pressingIntensity: 'more_often',
      preventShortGkDistribution: true,
      whenLostPossession: 'counter_press',
      whenWonPossession: 'hold_shape',
      playOutOfDefence: true,
      workBallIntoBox: true,
      dribbleMode: 'dribble_less',
    },
    roleVariants: [
      { slotId: 'gk', roleId: 'sk', duty: 'Defend' },
      { slotId: 'dr', roleId: 'fb', duty: 'Support' },
      { slotId: 'dcr', roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dcl', roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', roleId: 'wb', duty: 'Attack' },
      { slotId: 'dm', roleId: 'half_back', duty: 'Defend' },
      { slotId: 'mcr', roleId: 'bbm', duty: 'Support' },
      { slotId: 'mcl', roleId: 'mezzala', duty: 'Attack' },
      { slotId: 'amr', roleId: 'inverted_winger', duty: 'Support' },
      { slotId: 'aml', roleId: 'inside_forward', duty: 'Attack' },
      { slotId: 'stc', roleId: 'dlf', duty: 'Support' },
    ],
  },
  // 3. Fluid Counter-Attack 5-3-2 / 3-5-2 WB
  {
    presetId: 'fluid_counter_532',
    presetName: 'Fluid Counter-Attack 5-3-2',
    formationTemplateId: '532_wb',
    formationShape: '5-3-2',
    instructions: {
      mentality: 'cautious',
      tempo: 'higher',
      passingDirectness: 'direct',
      lineOfEngagement: 'mid_block',
      defensiveLine: 'standard',
      pressingIntensity: 'standard',
      whenLostPossession: 'regroup',
      whenWonPossession: 'counter',
      passIntoSpace: true,
      crossType: 'whipped',
    },
    roleVariants: [
      { slotId: 'gk', roleId: 'gk', duty: 'Defend' },
      { slotId: 'dc', roleId: 'cd', duty: 'Cover' },
      { slotId: 'dcr', roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dcl', roleId: 'cd', duty: 'Defend' },
      { slotId: 'wbr', roleId: 'wb', duty: 'Attack' },
      { slotId: 'wbl', roleId: 'wb', duty: 'Support' },
      { slotId: 'dm', roleId: 'anchor', duty: 'Defend' },
      { slotId: 'mcr', roleId: 'bbm', duty: 'Support' },
      { slotId: 'mcl', roleId: 'cm', duty: 'Attack' },
      { slotId: 'stcr', roleId: 'af', duty: 'Attack' },
      { slotId: 'stcl', roleId: 'target_forward', duty: 'Support' },
    ],
  },
  // 4. Classic Wing Play 4-4-2 Flat
  {
    presetId: 'wing_play_442',
    presetName: 'Classic Wing Play 4-4-2',
    formationTemplateId: '442_flat',
    formationShape: '4-4-2',
    instructions: {
      mentality: 'positive',
      attackingWidth: 'wide',
      tempo: 'higher',
      passingDirectness: 'direct',
      lineOfEngagement: 'mid_block',
      defensiveLine: 'standard',
      pressingIntensity: 'standard',
      whenLostPossession: 'regroup',
      whenWonPossession: 'counter',
      crossType: 'floated',
      playForSetPieces: true,
    },
    roleVariants: [
      { slotId: 'gk', roleId: 'gk', duty: 'Defend' },
      { slotId: 'dr', roleId: 'fb', duty: 'Defend' },
      { slotId: 'dcr', roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', roleId: 'fb', duty: 'Support' },
      { slotId: 'mr', roleId: 'w', duty: 'Attack' },
      { slotId: 'mcr', roleId: 'cm', duty: 'Defend' },
      { slotId: 'mcl', roleId: 'bbm', duty: 'Support' },
      { slotId: 'ml', roleId: 'w', duty: 'Support' },
      { slotId: 'stcr', roleId: 'target_forward', duty: 'Support' },
      { slotId: 'stcl', roleId: 'af', duty: 'Attack' },
    ],
  },
  // 5. Box Midfield 3-4-2-1
  {
    presetId: 'box_midfield_3421',
    presetName: 'Box Midfield Control 3-4-2-1',
    formationTemplateId: '3421_box',
    formationShape: '3-4-2-1',
    instructions: {
      mentality: 'positive',
      tempo: 'standard',
      passingDirectness: 'shorter',
      lineOfEngagement: 'high_press',
      defensiveLine: 'higher',
      pressingIntensity: 'more_often',
      preventShortGkDistribution: true,
      whenLostPossession: 'counter_press',
      whenWonPossession: 'counter',
      playOutOfDefence: true,
      workBallIntoBox: true,
    },
    roleVariants: [
      { slotId: 'gk', roleId: 'sk', duty: 'Support' },
      { slotId: 'dc', roleId: 'cd', duty: 'Cover' },
      { slotId: 'dcr', roleId: 'wcb', duty: 'Support' },
      { slotId: 'dcl', roleId: 'wcb', duty: 'Support' },
      { slotId: 'mr', roleId: 'wb', duty: 'Attack' },
      { slotId: 'ml', roleId: 'wb', duty: 'Attack' },
      { slotId: 'mcr', roleId: 'dlp', duty: 'Support' },
      { slotId: 'mcl', roleId: 'bwm', duty: 'Defend' },
      { slotId: 'amcr', roleId: 'ap', duty: 'Support' },
      { slotId: 'amcl', roleId: 'ss', duty: 'Attack' },
      { slotId: 'stc', roleId: 'af', duty: 'Attack' },
    ],
  },
];

/**
 * Calculates differences between the active tactic and recommended tactic.
 */
export function calculateRecommendationDiff(
  currentSlots: TacticSlot[] | undefined,
  currentFormationId: string | undefined,
  currentInstructions: TeamInstructions | undefined,
  recSlots: TacticSlot[],
  recFormationId: string,
  recInstructions: TeamInstructions
): RecommendationDiffV2 {
  const details: string[] = [];
  const formationChanged = currentFormationId !== recFormationId;
  if (formationChanged) {
    details.push(`Formasi berubah dari ${currentFormationId || 'Custom'} ke ${recFormationId}`);
  }

  let roleChangesCount = 0;
  let playerSwapsCount = 0;

  if (currentSlots && currentSlots.length > 0) {
    for (const recSlot of recSlots) {
      const match = currentSlots.find(s => s.slotId === recSlot.slotId || s.position === recSlot.position);
      if (match) {
        if (match.roleId !== recSlot.roleId || match.duty !== recSlot.duty) {
          roleChangesCount++;
          details.push(`Slot ${recSlot.position}: peran diubah menjadi ${recSlot.roleId.toUpperCase()} (${recSlot.duty})`);
        }
        if (match.assignedPlayerId !== recSlot.assignedPlayerId) {
          playerSwapsCount++;
          details.push(`Slot ${recSlot.position}: pergantian pemain starter`);
        }
      }
    }
  }

  let instructionChangesCount = 0;
  if (currentInstructions) {
    if (currentInstructions.mentality !== recInstructions.mentality) {
      instructionChangesCount++;
      details.push(`Mentality: ${currentInstructions.mentality} -> ${recInstructions.mentality}`);
    }
    if (currentInstructions.lineOfEngagement !== recInstructions.lineOfEngagement) {
      instructionChangesCount++;
      details.push(`Line of Engagement: ${currentInstructions.lineOfEngagement} -> ${recInstructions.lineOfEngagement}`);
    }
    if (currentInstructions.whenLostPossession !== recInstructions.whenLostPossession) {
      instructionChangesCount++;
      details.push(`Transisi Bertahan: ${currentInstructions.whenLostPossession} -> ${recInstructions.whenLostPossession}`);
    }
  }

  return {
    formationChanged,
    roleChangesCount,
    playerSwapsCount,
    instructionChangesCount,
    details,
  };
}

/**
 * Evaluates squad compatibility across FM24 presets using Hungarian matching,
 * 4-phase shape validation, contextual risk assessment, and data confidence.
 * Returns Top 3 "Rekomendasi Kecocokan Skuad".
 */
export function recommendSquadFitV2(
  players: (PlayerV2 | Player)[],
  currentSlots?: TacticSlot[],
  currentFormationId?: string,
  currentInstructions?: TeamInstructions
): SquadRecommendationV2[] {
  if (players.length < 11) {
    return [];
  }

  const playerMap: Record<string, PlayerV2 | Player> = {};
  for (const p of players) {
    playerMap[p.id] = p;
  }

  const evaluatedCandidates: SquadRecommendationV2[] = [];

  for (const blueprint of PRESET_BLUEPRINTS) {
    const template = FORMATION_TEMPLATES.find(t => t.id === blueprint.formationTemplateId);
    if (!template) continue;

    // Build tactical slots from blueprint role variants
    const candidateSlots: TacticSlot[] = template.slots.map(s => {
      const variant = blueprint.roleVariants.find(v => v.slotId === s.slotId || v.slotId === s.position.toLowerCase());
      return {
        slotId: s.slotId,
        position: s.position,
        x: s.x,
        y: s.y,
        roleId: variant ? variant.roleId : s.roleId,
        duty: variant ? variant.duty : s.duty,
        customPIs: [],
      };
    });

    // 1. Global squad assignment using Hungarian algorithm
    const assignment = optimizeSquadAssignmentV2(candidateSlots, players);

    // 2. Build complete team instructions
    const instructions: TeamInstructions = {
      ...DEFAULT_TEAM_INSTRUCTIONS,
      ...blueprint.instructions,
    };

    // 3. Phase shape and contextual tactical analysis
    const analysis: TacticAnalysisV2 = analyzeTacticV2(assignment.assignedSlots, instructions, playerMap);

    // 4. Calculate Risk Mitigation Score
    const structuralWeaknessCount = analysis.findings.filter(f => f.severity === 'structural_weakness').length;
    const highConfidenceRisks = analysis.findings.filter(
      f => f.severity === 'conditional_risk' && f.confidence >= 80
    ).length;
    const fatalCount = analysis.fatalErrors.length;

    let riskScore = 100 - (fatalCount * 100 + structuralWeaknessCount * 25 + highConfidenceRisks * 10);
    riskScore = Math.max(0, Math.min(100, riskScore));

    // 5. Final Composite Ranking: 45% role fit, 35% cohesion, 15% risk, 5% confidence
    const fitScore = assignment.averagePlayerFit;
    const cohesionScore = analysis.tacticalCohesion;
    const confidenceScore = analysis.dataConfidence;

    const compositeScore = Math.round(
      0.45 * fitScore +
      0.35 * cohesionScore +
      0.15 * riskScore +
      0.05 * confidenceScore
    );

    // Key players summary
    const keyPlayers: KeyPlayerSummaryV2[] = [];
    for (const slot of assignment.assignedSlots) {
      if (!slot.assignedPlayerId) continue;
      const p = playerMap[slot.assignedPlayerId];
      if (!p) continue;
      const fit = assignment.scoreBreakdown[slot.slotId];
      const profile = getRoleDutyProfile(slot.roleId, slot.duty);
      keyPlayers.push({
        playerId: p.id,
        name: p.name,
        position: slot.position,
        roleName: profile?.roleName || slot.roleId.toUpperCase(),
        duty: slot.duty,
        fitScore: fit ? fit.totalScore : 50,
      });
    }
    // Sort key players descending
    keyPlayers.sort((a, b) => b.fitScore - a.fitScore);
    const topKeyPlayers = keyPlayers.slice(0, 3);

    // Strengths from synergies and metrics
    const strengths: string[] = [];
    for (const f of analysis.findings) {
      if (f.severity === 'synergy') {
        strengths.push(f.title);
      }
    }
    if (analysis.phaseShape.restDefenceShape) {
      strengths.push(`Struktur rest-defence ${analysis.phaseShape.restDefenceShape} (${analysis.phaseShape.restDefenceCount} pemain siaga)`);
    }

    // Weaknesses from findings
    const weaknesses: string[] = [];
    for (const f of analysis.findings) {
      if (f.severity === 'structural_weakness' || f.severity === 'conditional_risk') {
        weaknesses.push(f.title);
      }
    }
    if (assignment.emergencySlotIds.length > 0) {
      weaknesses.push(`${assignment.emergencySlotIds.length} posisi diisi secara darurat (emergency fit)`);
    }

    // Diff preview
    const diff = calculateRecommendationDiff(
      currentSlots,
      currentFormationId,
      currentInstructions,
      assignment.assignedSlots,
      blueprint.formationTemplateId,
      instructions
    );

    evaluatedCandidates.push({
      id: blueprint.presetId,
      presetName: blueprint.presetName,
      formationName: template.name,
      formationShape: blueprint.formationShape,
      compositeScore,
      roleFitScore: fitScore,
      tacticalCohesionScore: cohesionScore,
      dataConfidenceScore: confidenceScore,
      slots: assignment.assignedSlots,
      teamInstructions: instructions,
      keyPlayers: topKeyPlayers,
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      diff,
      analysis,
    });
  }

  // Sort descending by composite score
  evaluatedCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

  // Return Top 3 recommendations
  return evaluatedCandidates.slice(0, 3);
}

/**
 * Creates atomic patch payload with undo capability for applying a recommendation.
 */
export function createAtomicApplyPayload(
  currentSlots: TacticSlot[],
  currentFormationId: string,
  currentInstructions: TeamInstructions,
  recommendation: SquadRecommendationV2
): AtomicApplyPayloadV2 {
  return {
    appliedAt: Date.now(),
    targetRecommendationId: recommendation.id,
    previousStateSnapshot: {
      slots: currentSlots.map(s => ({ ...s })),
      formationId: currentFormationId,
      instructions: { ...currentInstructions },
    },
    newState: {
      slots: recommendation.slots.map(s => ({ ...s })),
      formationId: recommendation.id,
      instructions: { ...recommendation.teamInstructions },
      analysis: recommendation.analysis,
    },
  };
}

/**
 * Creates atomic undo payload to revert back to previous snapshot.
 */
export function createAtomicUndoPayload(applyPayload: AtomicApplyPayloadV2): AtomicApplyPayloadV2 {
  return {
    appliedAt: Date.now(),
    targetRecommendationId: 'undo_' + applyPayload.targetRecommendationId,
    previousStateSnapshot: {
      slots: applyPayload.newState.slots.map(s => ({ ...s })),
      formationId: applyPayload.newState.formationId,
      instructions: { ...applyPayload.newState.instructions },
    },
    newState: {
      slots: applyPayload.previousStateSnapshot.slots.map(s => ({ ...s })),
      formationId: applyPayload.previousStateSnapshot.formationId,
      instructions: { ...applyPayload.previousStateSnapshot.instructions },
      analysis: applyPayload.newState.analysis,
    },
  };
}

