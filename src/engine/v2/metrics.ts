import { TacticSlot, TeamInstructions, Player } from '../../types';
import { PlayerV2, TacticalMetricsV2, PhaseShape } from './types';
import { getRoleDutyProfile } from './roleDutyProfiles';

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function getAvgAttribute(
  slots: TacticSlot[],
  players: Record<string, PlayerV2 | Player> | undefined,
  attrName: string,
  filterPos?: string[]
): number | undefined {
  if (!players) return undefined;
  const targetSlots = filterPos ? slots.filter(s => filterPos.includes(s.position)) : slots;
  let sum = 0;
  let count = 0;
  for (const s of targetSlots) {
    if (!s.assignedPlayerId) continue;
    const p = players[s.assignedPlayerId];
    if (p && p.attributes && typeof p.attributes[attrName] === 'number') {
      sum += p.attributes[attrName] as number;
      count++;
    }
  }
  return count > 0 ? sum / count : undefined;
}

/**
 * Calculates comprehensive 16 tactical metrics (0-100 scale)
 * based on tactical slots, instructions, role-duty profiles, and phase coordinates.
 */
export function calculateTacticalMetricsV2(
  slots: TacticSlot[],
  instructions: TeamInstructions,
  phaseShape: PhaseShape,
  players?: Record<string, PlayerV2 | Player>
): TacticalMetricsV2 {
  const coords = phaseShape.playerCoords;

  // 1. Width Left & Right
  let widthLeftRaw = 20;
  let widthRightRaw = 20;

  for (const p of coords) {
    if (p.position === 'GK') continue;
    if (p.inPossession.x <= 25 && p.inPossession.y <= 60) {
      const contribution = p.duty === 'Attack' ? 35 : p.duty === 'Support' ? 25 : 15;
      widthLeftRaw += contribution;
    }
    if (p.inPossession.x >= 75 && p.inPossession.y <= 60) {
      const contribution = p.duty === 'Attack' ? 35 : p.duty === 'Support' ? 25 : 15;
      widthRightRaw += contribution;
    }
  }

  if (instructions.attackingWidth === 'fairly_wide') {
    widthLeftRaw += 5;
    widthRightRaw += 5;
  } else if (instructions.attackingWidth === 'wide') {
    widthLeftRaw += 12;
    widthRightRaw += 12;
  } else if (instructions.attackingWidth === 'fairly_narrow') {
    widthLeftRaw -= 5;
    widthRightRaw -= 5;
  } else if (instructions.attackingWidth === 'narrow') {
    widthLeftRaw -= 10;
    widthRightRaw -= 10;
  }

  const widthLeft = clamp(widthLeftRaw);
  const widthRight = clamp(widthRightRaw);

  // 2. Depth and Runners
  let runnerCount = 0;
  for (const s of slots) {
    const prof = getRoleDutyProfile(s.roleId, s.duty);
    if (!prof) continue;
    if (
      s.duty === 'Attack' ||
      prof.movement.depth === 'get_further_forward' ||
      prof.movement.boxRuns === 'frequent' ||
      prof.movement.boxRuns === 'primary_target' ||
      s.roleId === 'shadow_striker' ||
      s.roleId === 'poacher' ||
      s.roleId === 'af'
    ) {
      runnerCount++;
    }
  }

  let depthRaw = 25 + runnerCount * 14;
  if (instructions.passIntoSpace) depthRaw += 12;
  if (instructions.mentality === 'attacking' || instructions.mentality === 'very_attacking') depthRaw += 10;
  if (instructions.mentality === 'defensive' || instructions.mentality === 'very_defensive') depthRaw -= 15;
  const depthAndRunners = clamp(depthRaw);

  // 3. Box Occupation
  let boxArrivers = 0;
  for (const p of coords) {
    if (p.position === 'GK') continue;
    if (p.inPossession.y <= 24 && p.inPossession.x >= 24 && p.inPossession.x <= 76) {
      boxArrivers++;
    }
  }
  let boxRaw = 20 + boxArrivers * 20;
  if (instructions.workBallIntoBox) boxRaw += 8;
  const boxOccupation = clamp(boxRaw);

  // 4. Central & Half-Space Occupation
  let centralCount = 0;
  let halfSpaceCount = 0;
  for (const p of coords) {
    if (p.position === 'GK') continue;
    if (p.inPossession.y > 20 && p.inPossession.y < 70) {
      if (p.inPossession.x >= 40 && p.inPossession.x <= 60) {
        centralCount++;
      } else if (
        (p.inPossession.x >= 24 && p.inPossession.x < 40) ||
        (p.inPossession.x > 60 && p.inPossession.x <= 76)
      ) {
        halfSpaceCount++;
      }
    }
  }
  const centralHalfSpaceOccupation = clamp(25 + centralCount * 12 + halfSpaceCount * 10);

  // 5. Build-Up Outlets and Triangles
  let deepOutlets = 0;
  let hasPlaymakerDeep = false;
  let hasSweeperKeeper = false;

  for (const s of slots) {
    if (s.position === 'GK' && s.roleId === 'sk') hasSweeperKeeper = true;
    if (['DC', 'DM', 'DR', 'DL'].includes(s.position)) {
      if (['dpm', 'regista', 'dlp', 'bpd', 'half_back', 'ifb', 'iwb'].includes(s.roleId)) {
        deepOutlets += 2;
        if (s.roleId === 'dlp' || s.roleId === 'regista') hasPlaymakerDeep = true;
      } else {
        deepOutlets += 1;
      }
    }
  }

  let buildUpRaw = 30 + deepOutlets * 6;
  if (hasSweeperKeeper) buildUpRaw += 10;
  if (hasPlaymakerDeep) buildUpRaw += 12;
  if (instructions.playOutOfDefence) buildUpRaw += 12;
  if (instructions.passingDirectness === 'shorter' || instructions.passingDirectness === 'slightly_shorter') buildUpRaw += 8;
  if (instructions.passingDirectness === 'direct' || instructions.passingDirectness === 'slightly_more_direct') buildUpRaw -= 10;
  const avgPassing = getAvgAttribute(slots, players, 'Passing', ['DC', 'DM', 'DR', 'DL']);
  if (avgPassing !== undefined) buildUpRaw += (avgPassing - 10) * 1.5;
  const buildUpOutletsAndTriangles = clamp(buildUpRaw);

  // 6. Progression and Press Resistance
  let pressResistantProfiles = 0;
  for (const s of slots) {
    if (['dlp', 'regista', 'ap', 'rp', 'bbm', 'mezzala', 'bpd', 'f9'].includes(s.roleId)) {
      pressResistantProfiles++;
    }
  }
  let progRaw = 35 + pressResistantProfiles * 10;
  if (instructions.dribbleMode === 'dribble_less') progRaw += 5;
  if (instructions.tempo === 'lower' || instructions.tempo === 'much_lower') progRaw += 5;
  const avgVision = getAvgAttribute(slots, players, 'Vision', ['MC', 'DM', 'AMC']);
  if (avgVision !== undefined) progRaw += (avgVision - 10) * 1.5;
  const progressionAndPressResistance = clamp(progRaw);

  // 7. Pressing Access and Support
  let pressingFrontline = 0;
  for (const s of slots) {
    if (['STC', 'AMC', 'AML', 'AMR'].includes(s.position)) {
      if (s.roleId === 'pf' || s.roleId === 'bwm') pressingFrontline += 2;
      else if (!['trequartista', 'poacher', 'enganche'].includes(s.roleId)) pressingFrontline += 1;
    }
  }

  let pressRaw = 30 + pressingFrontline * 8;
  if (instructions.lineOfEngagement === 'high_press') pressRaw += 20;
  else if (instructions.lineOfEngagement === 'low_block') pressRaw -= 20;

  if (instructions.pressingIntensity === 'much_more_often') pressRaw += 20;
  else if (instructions.pressingIntensity === 'more_often') pressRaw += 10;
  else if (instructions.pressingIntensity === 'less_often') pressRaw -= 10;

  if (instructions.preventShortGkDistribution) pressRaw += 10;
  const pressingAccessAndSupport = clamp(pressRaw);

  // 8. Block Compactness
  const loeMap: Record<string, number> = {
    high_press: 4,
    mid_block: 3,
    low_block: 2,
  };
  const dlineMap: Record<string, number> = {
    much_higher: 5,
    higher: 4,
    standard: 3,
    lower: 2,
    much_lower: 1,
  };

  const loeScore = loeMap[instructions.lineOfEngagement] ?? 3;
  const dlineScore = dlineMap[instructions.defensiveLine] ?? 3;
  const verticalStretch = Math.abs(loeScore - dlineScore);

  let compactnessRaw = 90 - verticalStretch * 28;
  if (instructions.defensiveTraps === 'trap_inside') compactnessRaw += 6;
  const blockCompactness = clamp(compactnessRaw);

  // 9. Defensive Line Protection
  let dmShieldCount = 0;
  for (const s of slots) {
    if (s.position === 'DM') {
      if (['anchor', 'half_back', 'dm', 'bwm'].includes(s.roleId)) {
        dmShieldCount += (s.duty === 'Defend' ? 2 : 1.5);
      } else {
        dmShieldCount += 1;
      }
    } else if (s.position === 'MC' && s.duty === 'Defend') {
      dmShieldCount += 0.8;
    }
  }

  let defLineProtRaw = 25 + dmShieldCount * 28;
  if (instructions.defensiveLine === 'much_higher' && dmShieldCount < 1) {
    defLineProtRaw -= 20;
  }
  const defensiveLineProtection = clamp(defLineProtRaw);

  // 10. Rest Defence Coverage
  const rdCount = phaseShape.restDefenceCount;
  let restDefRaw = 20;
  if (rdCount >= 5) restDefRaw = 95;
  else if (rdCount === 4) restDefRaw = 85;
  else if (rdCount === 3) restDefRaw = 70;
  else if (rdCount === 2) restDefRaw = 40;
  else restDefRaw = 15;

  const restDefenceCoverage = clamp(restDefRaw);

  // 11. Counterattack Threat
  let fastThreatCount = 0;
  for (const s of slots) {
    if (['STC', 'AML', 'AMR', 'WBL', 'WBR'].includes(s.position) && s.duty === 'Attack') {
      fastThreatCount++;
    }
  }
  let counterRaw = 30 + fastThreatCount * 12;
  if (instructions.whenWonPossession === 'counter') counterRaw += 22;
  if (instructions.passIntoSpace) counterRaw += 10;
  if (instructions.tempo === 'higher' || instructions.tempo === 'much_higher') counterRaw += 8;
  const counterattackThreat = clamp(counterRaw);

  // 12. Counterpress & Regroup Readiness
  let cpressRaw = 50;
  if (instructions.whenLostPossession === 'counter_press') {
    cpressRaw = (pressingAccessAndSupport * 0.6) + (blockCompactness * 0.4);
  } else if (instructions.whenLostPossession === 'regroup') {
    cpressRaw = (defensiveLineProtection * 0.5) + (restDefenceCoverage * 0.5);
  } else {
    cpressRaw = 60;
  }
  const counterpressRegroupReadiness = clamp(cpressRaw);

  // 13. Aerial Attack & Defence
  let aerialPresence = 0;
  for (const s of slots) {
    if (s.position === 'DC') aerialPresence += 1.5;
    if (s.position === 'STC' && ['tf', 'tm', 'target_forward', 'target_man'].includes(s.roleId)) {
      aerialPresence += 2;
    }
  }
  let aerialRaw = 40 + aerialPresence * 12;
  if (instructions.crossType === 'floated') aerialRaw += 10;
  const avgJumping = getAvgAttribute(slots, players, 'JumpingReach', ['DC', 'STC']);
  if (avgJumping !== undefined) aerialRaw += (avgJumping - 10) * 1.5;
  const aerialAttackDefence = clamp(aerialRaw);

  // 14. Set Piece Threat
  let setPieceRaw = 45;
  if (instructions.playForSetPieces) setPieceRaw += 25;
  if (instructions.crossType === 'floated' || instructions.crossType === 'whipped') setPieceRaw += 10;
  const setPieceThreat = clamp(setPieceRaw);

  // 15. Physical Demand & Fatigue Risk
  let fatigueScore = 20;
  if (instructions.pressingIntensity === 'much_more_often') fatigueScore += 25;
  else if (instructions.pressingIntensity === 'more_often') fatigueScore += 15;

  if (instructions.tempo === 'much_higher') fatigueScore += 20;
  else if (instructions.tempo === 'higher') fatigueScore += 10;

  if (instructions.lineOfEngagement === 'high_press') fatigueScore += 15;
  if (instructions.whenLostPossession === 'counter_press') fatigueScore += 15;
  if (instructions.tackling === 'get_stuck_in') fatigueScore += 10;
  const avgStamina = getAvgAttribute(slots, players, 'Stamina');
  if (avgStamina !== undefined) fatigueScore -= (avgStamina - 10) * 1.2;

  const physicalDemandFatigueRisk = clamp(fatigueScore);

  return {
    widthLeft,
    widthRight,
    depthAndRunners,
    boxOccupation,
    centralHalfSpaceOccupation,
    buildUpOutletsAndTriangles,
    progressionAndPressResistance,
    pressingAccessAndSupport,
    blockCompactness,
    defensiveLineProtection,
    restDefenceCoverage,
    counterattackThreat,
    counterpressRegroupReadiness,
    aerialAttackDefence,
    setPieceThreat,
    physicalDemandFatigueRisk,
  };
}
