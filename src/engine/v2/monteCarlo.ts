import {
  TacticSlot,
  TeamInstructions,
  Player,
  DEFAULT_TEAM_INSTRUCTIONS,
} from '../../types';
import {
  PlayerV2,
  SimulationSnapshotV2,
  SimulationResultV2,
  ScenarioResultV2,
} from './types';
import { calculatePlayerSlotFit } from './hungarian';
import { analyzeTacticV2 } from './analyzer';
import { hashStringDeterministic } from './snapshot';
import { SANDBOX_OPPONENTS } from '../sandbox';

// Simple deterministic PRNG: Mulberry32
export function createMulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromHash(str: string): number {
  const hash = hashStringDeterministic(str);
  // Take lowest 32 bits as signed integer
  let n = 0;
  for (let i = 0; i < hash.length; i++) {
    n = (n << 5) - n + hash.charCodeAt(i);
    n |= 0;
  }
  return n;
}

export interface SimulationConfigV2 {
  matchesPerScenario?: number; // Default 2000
  engineVersion?: string;
}

export interface OpponentProfileV2 {
  id: string;
  name: string;
  formation: string;
  philosophy: string;
  keyThreats: string[];
  slots: TacticSlot[];
  instructions: TeamInstructions;
  baseCapacity: number; // 1 - 20
}

/**
 * Converts legacy SandboxOpponent into full OpponentProfileV2
 */
export function getOpponentProfileV2(oppId: string): OpponentProfileV2 {
  const legacy = SANDBOX_OPPONENTS.find(o => o.id === oppId) || SANDBOX_OPPONENTS[0];

  const slots: TacticSlot[] = legacy.slots.map((s, idx) => ({
    slotId: `opp_slot_${idx}`,
    position: s.position,
    x: 50,
    y: 50,
    roleId: s.role,
    duty: s.duty,
    customPIs: [],
  }));

  const instructions: TeamInstructions = {
    ...DEFAULT_TEAM_INSTRUCTIONS,
    ...legacy.instructions,
  };

  return {
    id: legacy.id,
    name: legacy.name,
    formation: legacy.formation,
    philosophy: legacy.philosophy,
    keyThreats: legacy.keyThreats,
    slots,
    instructions,
    baseCapacity: 13.5,
  };
}

/**
 * Calculates user XI capacity score U (1-20 scale) and standard deviation D.
 */
export function calculateTeamCapacity(
  slots: TacticSlot[],
  players: Record<string, PlayerV2 | Player>
): { capacityU: number; stdDevD: number } {
  const ratings: number[] = [];

  for (const slot of slots) {
    if (slot.assignedPlayerId && players[slot.assignedPlayerId]) {
      const p = players[slot.assignedPlayerId];
      const fit = calculatePlayerSlotFit(p, slot);
      // Map 0-100 fit score to 1-20 scale
      const rating = 1 + (fit.totalScore / 100) * 19;
      ratings.push(rating);
    } else {
      // Unassigned or emergency baseline
      ratings.push(7.0);
    }
  }

  if (ratings.length === 0) {
    return { capacityU: 10, stdDevD: 1.5 };
  }

  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  return {
    capacityU: Math.round(mean * 10) / 10,
    stdDevD: Math.round(stdDev * 10) / 10,
  };
}

/**
 * Calculates dynamic gap Delta and target capacity for the 3 tiers.
 */
export function calculateTierCapacities(capacityU: number, stdDevD: number): {
  below: number;
  equal: number;
  above: number;
  delta: number;
} {
  const deltaRaw = 1.5 + 0.35 * stdDevD;
  const delta = Math.max(1.5, Math.min(2.5, Math.round(deltaRaw * 10) / 10));

  const below = Math.max(1, Math.min(20, Math.round((capacityU - delta) * 10) / 10));
  const equal = Math.max(1, Math.min(20, capacityU));
  const above = Math.max(1, Math.min(20, Math.round((capacityU + delta) * 10) / 10));

  return { below, equal, above, delta };
}

/**
 * Wilson score interval for binomial confidence interval (95% confidence).
 */
function wilsonInterval(k: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / denom;
  return [
    Math.round(Math.max(0, center - half) * 1000) / 10,
    Math.round(Math.min(1, center + half) * 1000) / 10,
  ];
}

/**
 * Simulates a single scenario (e.g. User vs Opponent X on Tier Y) for N matches.
 */
export function simulateScenario(
  snapshot: SimulationSnapshotV2,
  opponent: OpponentProfileV2,
  capacityTier: 'below' | 'equal' | 'above',
  opponentCapacity: number,
  userCapacity: number,
  matchesCount: number,
  players: Record<string, PlayerV2 | Player>
): ScenarioResultV2 {
  const seedString = `${snapshot.hash}_${snapshot.engineVersion}_${opponent.id}_${capacityTier}`;
  const prng = createMulberry32(seedFromHash(seedString));

  // Analyze both sides
  const userAnalysis = analyzeTacticV2(snapshot.slots as TacticSlot[], snapshot.teamInstructions, players);
  const oppAnalysis = analyzeTacticV2(opponent.slots, opponent.instructions);

  const uMetrics = userAnalysis.metrics;
  const oMetrics = oppAnalysis.metrics;

  // Capacity differential (-19 to +19)
  const capacityDiff = userCapacity - opponentCapacity;

  // Tactical differential
  const userControl =
    (uMetrics.progressionAndPressResistance * 0.4 +
      uMetrics.buildUpOutletsAndTriangles * 0.3 +
      uMetrics.blockCompactness * 0.3) /
    100;

  const oppControl =
    (oMetrics.progressionAndPressResistance * 0.4 +
      oMetrics.buildUpOutletsAndTriangles * 0.3 +
      oMetrics.blockCompactness * 0.3) /
    100;

  // Base possession percentage
  const basePossession = 50 + (userControl - oppControl) * 20 + capacityDiff * 2.2;
  const avgPossession = Math.max(30, Math.min(70, Math.round(basePossession * 10) / 10));

  let winCount = 0;
  let drawCount = 0;
  let lossCount = 0;
  let totalGoalsFor = 0;
  let totalGoalsAgainst = 0;
  let totalXGFor = 0;
  let totalXGAgainst = 0;

  // Fatigue risk modifier
  const fatiguePenalty = uMetrics.physicalDemandFatigueRisk > 75 ? (uMetrics.physicalDemandFatigueRisk - 75) * 0.005 : 0;

  for (let m = 0; m < matchesCount; m++) {
    // 25 - 35 possession chains per match
    const chains = 25 + Math.floor(prng() * 11);
    let matchGoalsFor = 0;
    let matchGoalsAgainst = 0;
    let matchXGFor = 0;
    let matchXGAgainst = 0;

    for (let c = 0; c < chains; c++) {
      const isSecondHalf = c > chains / 2;
      const currentFatigue = isSecondHalf ? fatiguePenalty : 0;

      // Determine which team controls this chain
      const isUserChain = prng() * 100 < avgPossession;

      if (isUserChain) {
        // Attack chain for user
        const attackQuality =
          (uMetrics.boxOccupation * 0.4 + uMetrics.depthAndRunners * 0.3 + (uMetrics.widthLeft + uMetrics.widthRight) * 0.15) /
          100;
        const oppDefQuality =
          (oMetrics.defensiveLineProtection * 0.5 + oMetrics.restDefenceCoverage * 0.5) / 100;

        const shotProb = Math.max(0.08, 0.28 + (attackQuality - oppDefQuality) * 0.2 + capacityDiff * 0.02 - currentFatigue);
        if (prng() < shotProb) {
          const xg = 0.05 + prng() * 0.35 + (uMetrics.boxOccupation > 70 ? 0.08 : 0);
          matchXGFor += xg;
          if (prng() < xg) {
            matchGoalsFor++;
          }
        }
      } else {
        // Attack chain for opponent
        const oppAttack =
          (oMetrics.boxOccupation * 0.4 + oMetrics.depthAndRunners * 0.3 + (oMetrics.widthLeft + oMetrics.widthRight) * 0.15) /
          100;
        const userDefence =
          (uMetrics.defensiveLineProtection * 0.5 + uMetrics.restDefenceCoverage * 0.5) / 100;

        const shotProb = Math.max(0.08, 0.28 + (oppAttack - userDefence) * 0.2 - capacityDiff * 0.02 + currentFatigue);
        if (prng() < shotProb) {
          const xg = 0.05 + prng() * 0.35;
          matchXGAgainst += xg;
          if (prng() < xg) {
            matchGoalsAgainst++;
          }
        }
      }
    }

    totalGoalsFor += matchGoalsFor;
    totalGoalsAgainst += matchGoalsAgainst;
    totalXGFor += matchXGFor;
    totalXGAgainst += matchXGAgainst;

    if (matchGoalsFor > matchGoalsAgainst) winCount++;
    else if (matchGoalsFor === matchGoalsAgainst) drawCount++;
    else lossCount++;
  }

  // Exact 100% distribution
  const winRate = Math.round((winCount / matchesCount) * 1000) / 10;
  const drawRate = Math.round((drawCount / matchesCount) * 1000) / 10;
  const lossRate = Math.round((100 - winRate - drawRate) * 10) / 10;

  const avgGoalsFor = Math.round((totalGoalsFor / matchesCount) * 100) / 100;
  const avgGoalsAgainst = Math.round((totalGoalsAgainst / matchesCount) * 100) / 100;
  const avgXGFor = Math.round((totalXGFor / matchesCount) * 100) / 100;
  const avgXGAgainst = Math.round((totalXGAgainst / matchesCount) * 100) / 100;

  // Matchup Rating: 0 - 100 tactical advantage (not raw win prob)
  const xGDiff = avgXGFor - avgXGAgainst;
  const matchupRating = Math.max(5, Math.min(95, Math.round(50 + xGDiff * 22 + (avgPossession - 50) * 0.8)));

  // Identify decisive phase & top advantages/risks
  let decisivePhase: ScenarioResultV2['decisivePhase'] = 'midfield_press';
  if (uMetrics.restDefenceCoverage < 50 || oMetrics.counterattackThreat > 75) {
    decisivePhase = 'transition';
  } else if (uMetrics.boxOccupation > 75 || oMetrics.defensiveLineProtection < 50) {
    decisivePhase = 'final_third';
  } else if (uMetrics.buildUpOutletsAndTriangles < 45) {
    decisivePhase = 'build_up';
  }

  const topAdvantages: string[] = [];
  if (uMetrics.restDefenceCoverage >= 75) {
    topAdvantages.push(`Rest-defence ${userAnalysis.phaseShape.restDefenceShape} efektif meredam serangan balik`);
  }
  if (avgPossession > 53) {
    topAdvantages.push(`Mendominasi lini tengah (${avgPossession}% ball possession)`);
  }
  if (avgXGFor > 1.6) {
    topAdvantages.push(`Peluang berkualitas tinggi rata-rata ${avgXGFor} xG per laga`);
  }
  if (topAdvantages.length === 0) {
    topAdvantages.push('Kerapatan blok bertahan disiplin menjaga skor tetap ketat');
  }

  const topRisks: string[] = [];
  if (uMetrics.physicalDemandFatigueRisk >= 80) {
    topRisks.push('Penurunan intensitas babak kedua akibat intensitas pressing');
  }
  if (avgGoalsAgainst > 1.4) {
    topRisks.push(`Kebobolan relatif tinggi (${avgGoalsAgainst} gol/laga)`);
  }
  if (opponent.keyThreats[0]) {
    topRisks.push(`Ancaman lawan: ${opponent.keyThreats[0]}`);
  }

  const confidenceInterval = wilsonInterval(winCount, matchesCount);

  return {
    scenarioId: `${opponent.id}_${capacityTier}`,
    opponentId: opponent.id,
    opponentName: opponent.name,
    opponentFormation: opponent.formation,
    capacityTier,
    userCapacityScore: userCapacity,
    opponentCapacityScore: opponentCapacity,
    winCount,
    drawCount,
    lossCount,
    winRate,
    drawRate,
    lossRate,
    avgGoalsFor,
    avgGoalsAgainst,
    avgXGFor,
    avgXGAgainst,
    avgPossession,
    matchupRating,
    topAdvantages: topAdvantages.slice(0, 3),
    topRisks: topRisks.slice(0, 3),
    decisivePhase,
    confidenceInterval,
  };
}

/**
 * Runs full 24-scenario Monte Carlo simulation pipeline (8 archetypes x 3 tiers).
 */
export function runFullSimulationV2(
  snapshot: SimulationSnapshotV2,
  players: Record<string, PlayerV2 | Player>,
  config: SimulationConfigV2 = {},
  onProgress?: (progress: number, scenarioIndex: number, totalScenarios: number) => void
): SimulationResultV2 {
  const matchesPerScenario = config.matchesPerScenario || 2000;
  const engineVersion = config.engineVersion || '2.0.0';

  const { capacityU, stdDevD } = calculateTeamCapacity(snapshot.slots as TacticSlot[], players);
  const tiers = calculateTierCapacities(capacityU, stdDevD);

  const scenarios: ScenarioResultV2[] = [];
  const tierList: Array<'below' | 'equal' | 'above'> = ['below', 'equal', 'above'];
  const totalScenarios = SANDBOX_OPPONENTS.length * tierList.length; // 8 * 3 = 24

  let completed = 0;

  for (const opp of SANDBOX_OPPONENTS) {
    const oppProfile = getOpponentProfileV2(opp.id);

    for (const tier of tierList) {
      const oppCapacity = tiers[tier];

      const scenarioRes = simulateScenario(
        snapshot,
        oppProfile,
        tier,
        oppCapacity,
        capacityU,
        matchesPerScenario,
        players
      );

      scenarios.push(scenarioRes);
      completed++;
      if (onProgress) {
        const progressPct = Math.round((completed / totalScenarios) * 100);
        onProgress(progressPct, completed, totalScenarios);
      }
    }
  }

  const totalMatches = totalScenarios * matchesPerScenario; // e.g. 24 * 2000 = 48,000

  return {
    snapshotHash: snapshot.hash,
    engineVersion,
    timestamp: Date.now(),
    totalMatches,
    scenarios,
    isOutdated: false,
  };
}
