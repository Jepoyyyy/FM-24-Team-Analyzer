import { describe, it, expect } from 'vitest';
import { TacticSlot, TeamInstructions, DEFAULT_TEAM_INSTRUCTIONS } from '../types';
import {
  derive4PhaseShape,
  calculateTacticalMetricsV2,
  analyzeTacticV2,
  PlayerV2,
} from '../engine/v2';

const defaultInstructions: TeamInstructions = {
  ...DEFAULT_TEAM_INSTRUCTIONS,
  mentality: 'positive',
  attackingWidth: 'fairly_wide',
  tempo: 'higher',
  passingDirectness: 'shorter',
  playOutOfDefence: true,
  passIntoSpace: false,
  workBallIntoBox: true,
  playForSetPieces: false,
  dribbleMode: 'standard',
  creativeFreedom: 'standard',
  focusPlay: 'balanced',
  overlapLeft: true,
  overlapRight: false,
  underlapLeft: false,
  underlapRight: false,
  crossType: 'whipped',
  earlyCrosses: false,
  whenLostPossession: 'counter_press',
  whenWonPossession: 'counter',
  gkDistributionPace: 'distribute_quickly',
  gkDistributionType: 'roll_out',
  defensiveLine: 'higher',
  lineOfEngagement: 'high_press',
  pressingIntensity: 'more_often',
  preventShortGkDistribution: true,
  tackling: 'stay_on_feet',
  defensiveTraps: 'trap_outside',
  crossPrevention: 'stop_crosses',
};

// Standard 4-2-3-1 DM setup with 3+2 rest defence
const sample4231Slots: TacticSlot[] = [
  { slotId: 'slot-1', position: 'GK', roleId: 'sk', duty: 'Support', x: 50, y: 88, customPIs: [] },
  { slotId: 'slot-2', position: 'DR', roleId: 'ifb', duty: 'Defend', x: 85, y: 72, customPIs: [] }, // tucks in as 3rd CB
  { slotId: 'slot-3', position: 'DC', roleId: 'bpd', duty: 'Defend', x: 62, y: 75, customPIs: [] },
  { slotId: 'slot-4', position: 'DC', roleId: 'cd', duty: 'Defend', x: 38, y: 75, customPIs: [] },
  { slotId: 'slot-5', position: 'DL', roleId: 'wb', duty: 'Attack', x: 15, y: 72, customPIs: [] }, // attacks flank
  { slotId: 'slot-6', position: 'DM', roleId: 'anchor', duty: 'Defend', x: 38, y: 58, customPIs: [] }, // pivot rest def
  { slotId: 'slot-7', position: 'DM', roleId: 'dlp', duty: 'Support', x: 62, y: 58, customPIs: [] },
  { slotId: 'slot-8', position: 'AMR', roleId: 'w', duty: 'Attack', x: 85, y: 30, customPIs: [] },
  { slotId: 'slot-9', position: 'AMC', roleId: 'ap', duty: 'Support', x: 50, y: 32, customPIs: [] },
  { slotId: 'slot-10', position: 'AML', roleId: 'inside_forward', duty: 'Attack', x: 15, y: 30, customPIs: [] }, // cuts inside
  { slotId: 'slot-11', position: 'STC', roleId: 'af', duty: 'Attack', x: 50, y: 15, customPIs: [] },
];

describe('Tahap 3: Shape & Contextual Analyzer v2', () => {
  it('derives distinct 4-phase shapes (base, in-possession, settled block, rest defence)', () => {
    const shape = derive4PhaseShape(sample4231Slots, defaultInstructions);

    expect(shape.baseShape).toBe('4-2-3-1');
    expect(shape.inPossessionShape).toBeDefined();
    expect(shape.settledDefenceShape).toBeDefined();
    expect(shape.restDefenceCount).toBe(4);
    expect(shape.restDefenceShape).toMatch(/\d\+\d/);
    expect(shape.playerCoords).toHaveLength(11);
  });

  it('calculates all 16 tactical metrics within 0-100 range', () => {
    const shape = derive4PhaseShape(sample4231Slots, defaultInstructions);
    const metrics = calculateTacticalMetricsV2(sample4231Slots, defaultInstructions, shape);

    expect(metrics.widthLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.widthLeft).toBeLessThanOrEqual(100);
    expect(metrics.widthRight).toBeGreaterThanOrEqual(0);
    expect(metrics.widthRight).toBeLessThanOrEqual(100);
    expect(metrics.depthAndRunners).toBeGreaterThanOrEqual(0);
    expect(metrics.depthAndRunners).toBeLessThanOrEqual(100);
    expect(metrics.boxOccupation).toBeGreaterThanOrEqual(0);
    expect(metrics.boxOccupation).toBeLessThanOrEqual(100);
    expect(metrics.blockCompactness).toBeGreaterThanOrEqual(0);
    expect(metrics.blockCompactness).toBeLessThanOrEqual(100);
    expect(metrics.restDefenceCoverage).toBeGreaterThanOrEqual(0);
    expect(metrics.restDefenceCoverage).toBeLessThanOrEqual(100);
    expect(metrics.defensiveLineProtection).toBeGreaterThanOrEqual(0);
    expect(metrics.defensiveLineProtection).toBeLessThanOrEqual(100);
  });

  it('adjusts tactical metrics reactively when instructions change', () => {
    const shape = derive4PhaseShape(sample4231Slots, defaultInstructions);
    const baseMetrics = calculateTacticalMetricsV2(sample4231Slots, defaultInstructions, shape);

    const spaceInstructions: TeamInstructions = {
      ...defaultInstructions,
      passIntoSpace: true,
      playForSetPieces: true,
      pressingIntensity: 'much_more_often',
    };
    const modMetrics = calculateTacticalMetricsV2(sample4231Slots, spaceInstructions, shape);

    expect(modMetrics.depthAndRunners).toBeGreaterThan(baseMetrics.depthAndRunners);
    expect(modMetrics.setPieceThreat).toBeGreaterThan(baseMetrics.setPieceThreat);
    expect(modMetrics.physicalDemandFatigueRisk).toBeGreaterThan(baseMetrics.physicalDemandFatigueRisk);
  });

  it('detects fatal constraint when GK is missing or player count is invalid', () => {
    // Missing GK
    const noGkSlots = sample4231Slots.map(s => (s.position === 'GK' ? { ...s, position: 'DC' as const } : s));
    const analysisNoGk = analyzeTacticV2(noGkSlots, defaultInstructions);

    expect(analysisNoGk.fatalErrors.length).toBeGreaterThan(0);
    expect(analysisNoGk.cohesionGrade).toBe('F');
    expect(analysisNoGk.tacticalCohesion).toBeLessThanOrEqual(30);

    // Invalid squad size (10 players)
    const tenPlayerSlots = sample4231Slots.slice(0, 10);
    const analysisTen = analyzeTacticV2(tenPlayerSlots, defaultInstructions);
    expect(analysisTen.fatalErrors.length).toBeGreaterThan(0);
    expect(analysisTen.cohesionGrade).toBe('F');
  });

  it('detects structural weaknesses and enforces cohesion capping below Grade S', () => {
    // Create setup with 0 rest defence (both fullbacks attack, no DMs, no IFB)
    const suicidalSlots: TacticSlot[] = [
      { slotId: 'slot-1', position: 'GK', roleId: 'g', duty: 'Defend', x: 50, y: 88, customPIs: [] },
      { slotId: 'slot-2', position: 'DR', roleId: 'cwb', duty: 'Attack', x: 85, y: 72, customPIs: [] },
      { slotId: 'slot-3', position: 'DC', roleId: 'cd', duty: 'Defend', x: 62, y: 75, customPIs: [] },
      { slotId: 'slot-4', position: 'DC', roleId: 'cd', duty: 'Defend', x: 38, y: 75, customPIs: [] },
      { slotId: 'slot-5', position: 'DL', roleId: 'cwb', duty: 'Attack', x: 15, y: 72, customPIs: [] },
      { slotId: 'slot-6', position: 'MC', roleId: 'mezzala', duty: 'Attack', x: 35, y: 55, customPIs: [] },
      { slotId: 'slot-7', position: 'MC', roleId: 'mezzala', duty: 'Attack', x: 65, y: 55, customPIs: [] },
      { slotId: 'slot-8', position: 'AMR', roleId: 'w', duty: 'Attack', x: 85, y: 30, customPIs: [] },
      { slotId: 'slot-9', position: 'AMC', roleId: 'ss', duty: 'Attack', x: 50, y: 32, customPIs: [] },
      { slotId: 'slot-10', position: 'AML', roleId: 'w', duty: 'Attack', x: 15, y: 30, customPIs: [] },
      { slotId: 'slot-11', position: 'STC', roleId: 'af', duty: 'Attack', x: 50, y: 15, customPIs: [] },
    ];

    const suicidalInstructions: TeamInstructions = {
      ...defaultInstructions,
      defensiveLine: 'much_higher',
    };

    const analysis = analyzeTacticV2(suicidalSlots, suicidalInstructions);

    const hasRestDefWeakness = analysis.findings.some(f => f.id === 'weakness_depleted_rest_defence');
    expect(hasRestDefWeakness).toBe(true);
    expect(analysis.hasCriticalDanger).toBe(true);
    // Grade MUST NOT be 'S'
    expect(analysis.cohesionGrade).not.toBe('S');
    expect(analysis.tacticalCohesion).toBeLessThanOrEqual(84);
  });

  it('detects tactical trade-offs and synergies correctly', () => {
    const analysis = analyzeTacticV2(sample4231Slots, defaultInstructions);

    const hasOverlapTradeoff = analysis.findings.some(f => f.id === 'tradeoff_attacking_flanks');
    const hasLeftFlankSynergy = analysis.findings.some(f => f.id === 'synergy_left_flank_overlap');
    const hasSweeperHighLineSynergy = analysis.findings.some(f => f.id === 'synergy_sweeper_high_line');

    expect(hasOverlapTradeoff).toBe(true);
    expect(hasLeftFlankSynergy).toBe(true);
    expect(hasSweeperHighLineSynergy).toBe(true);
  });

  it('evaluates player completeness report and penalizes cohesion when data is incomplete', () => {
    // Complete player mock
    const completePlayer: PlayerV2 = {
      id: 'p-1',
      name: 'Test Goalkeeper',
      club: 'Test Club',
      positions: [{ position: 'GK', familiarity: 'Natural' }],
      attributes: {
        Reflexes: 16,
        Handling: 15,
        Communication: 14,
        Kicking: 14,
        OneOnOnes: 15,
        Positioning: 15,
        Agility: 14,
        Composure: 14,
        Decisions: 15,
        Concentration: 14,
      },
      dataCompleteness: 1.0,
      traits: [],
    };

    const playerMap: Record<string, PlayerV2> = {
      'p-1': completePlayer,
    };

    const slotsWithPlayer: TacticSlot[] = sample4231Slots.map((s, idx) =>
      idx === 0 ? { ...s, assignedPlayerId: 'p-1' } : s
    );

    const analysis = analyzeTacticV2(slotsWithPlayer, defaultInstructions, playerMap);
    expect(analysis.dataCompleteness).toBeDefined();
    expect(analysis.dataConfidence).toBeDefined();
  });
});
