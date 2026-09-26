import {
  Position,
  Duty,
  PlayerInstructionType,
  TeamInstructions,
} from '../../types';

export const SCHEMA_VERSION_V2 = 2;

// 1. Positional Familiarity v2 (Includes Unknown)
export type PositionalFamiliarityV2 =
  | 'Natural'
  | 'Accomplished'
  | 'Competent'
  | 'Unconvincing'
  | 'Awkward'
  | 'Unknown';

export const FAMILIARITY_MULTIPLIER_V2: Record<PositionalFamiliarityV2, number> = {
  Natural: 1.0,
  Accomplished: 0.9,
  Competent: 0.7,
  Unconvincing: 0.5,
  Awkward: 0.3,
  Unknown: 0.15,
};

// 2. Player Model v2
export interface PlayerPositionV2 {
  position: Position;
  familiarity: PositionalFamiliarityV2;
}

export interface PlayerV2 {
  id: string;
  name: string;
  age?: number;
  club?: string;
  nationality?: string;
  positions: PlayerPositionV2[];
  // Attributes: scale 1-20 or undefined (never default to 10)
  attributes: Record<string, number | undefined>;
  traits?: string[];
  dataCompleteness?: number; // 0-100%
}

// 3. Role & Duty Profile v2
export interface MovementBehavior {
  width: 'hug_line' | 'stay_wider' | 'normal' | 'sit_narrower' | 'cut_inside';
  depth: 'stay_back' | 'drop_deep' | 'balanced' | 'get_further_forward';
  lateralMovement: 'disciplined' | 'channel_runner' | 'roam_from_position' | 'free_role';
  roaming: boolean;
  boxRuns: 'never' | 'situational' | 'frequent' | 'primary_target';
}

export interface PossessionBehavior {
  passingRisk: 'fewer_risky_passes' | 'standard' | 'take_more_risks';
  progressionRole: 'build_up_outlet' | 'progressor' | 'final_ball_creator' | 'finisher' | 'carrier';
  carrying: 'dribble_less' | 'standard' | 'dribble_more';
  crossing: 'cross_less' | 'standard' | 'cross_aim_target' | 'cross_far_post' | 'byline_cross' | 'deep_cross';
  ballAttraction: 'magnet' | 'neutral' | 'distributor';
}

export interface DefensiveBehavior {
  pressingIntensity: 'less_often' | 'standard' | 'more_often' | 'much_more_often';
  screening: 'none' | 'low' | 'moderate' | 'high' | 'anchor';
  marking: 'zonal' | 'tight' | 'specific';
  recoveryTrackback: 'low' | 'moderate' | 'high';
  aerialCover: boolean;
}

export interface TransitionBehavior {
  offensiveTransition: 'hold_shape' | 'counter_runner' | 'playmaker_conduit' | 'second_wave';
  defensiveTransition: 'counterpress_anchor' | 'counterpress_harasser' | 'regroup_fall_back' | 'rest_defence_cover';
}

export interface RoleDutyProfile {
  id: string; // e.g. "bpd_defend", "wb_attack"
  roleId: string; // e.g. "bpd", "wb"
  roleName: string;
  code: string;
  duty: Duty;
  compatiblePositions: Position[];
  keyAttributes: string[];
  desirableAttributes: string[];
  movement: MovementBehavior;
  possession: PossessionBehavior;
  defensive: DefensiveBehavior;
  transition: TransitionBehavior;
  lockedPIs: PlayerInstructionType[];
  allowedPIs: PlayerInstructionType[];
  incompatiblePIs: PlayerInstructionType[];
  description: string;
}

// 4. Coordinates & 4-Phase Shape
export interface PitchCoordinate {
  x: number; // 0 to 100 (left to right)
  y: number; // 0 to 100 (GK at ~90 to ST at ~15)
}

export interface PlayerPhaseCoords {
  slotId: string;
  position: Position;
  roleId: string;
  duty: Duty;
  base: PitchCoordinate;
  inPossession: PitchCoordinate;
  settledDefence: PitchCoordinate;
  attackingTransition: PitchCoordinate;
  defensiveTransition: PitchCoordinate;
  isRestDefence: boolean;
  restDefenceOrder?: number;
}

export interface PhaseShape {
  baseShape: string; // e.g. "4-2-3-1"
  inPossessionShape: string; // e.g. "3-2-5"
  settledDefenceShape: string; // e.g. "4-4-2"
  restDefenceShape: string; // e.g. "3+2"
  restDefenceCount: number;
  playerCoords: PlayerPhaseCoords[];
}

// 5. Tactical Metrics (Internal documented scale 0-100)
export interface TacticalMetricsV2 {
  widthLeft: number;
  widthRight: number;
  depthAndRunners: number;
  boxOccupation: number;
  centralHalfSpaceOccupation: number;
  buildUpOutletsAndTriangles: number;
  progressionAndPressResistance: number;
  pressingAccessAndSupport: number;
  blockCompactness: number;
  defensiveLineProtection: number;
  restDefenceCoverage: number;
  counterattackThreat: number;
  counterpressRegroupReadiness: number;
  aerialAttackDefence: number;
  setPieceThreat: number;
  physicalDemandFatigueRisk: number;
}

// 6. Contextual Findings & Cohesion
export type FindingSeverity =
  | 'fatal_constraint'
  | 'structural_weakness'
  | 'conditional_risk'
  | 'trade_off'
  | 'synergy'
  | 'optimization';

export interface TacticalFindingV2 {
  id: string;
  sourceMetadata: {
    ruleId: string;
    source: 'FM24_RULE' | 'GUIDE_TO_FOOTBALL' | 'PASSION_4_FM';
  };
  phase: 'in_possession' | 'out_of_possession' | 'transition' | 'general';
  severity: FindingSeverity;
  confidence: number; // 0-100%
  title: string;
  description: string;
  affectedSlots: string[];
  evidenceMetric?: keyof TacticalMetricsV2;
  benefit?: string;
  downside?: string;
  solutions: string[];
  expectedMetricDelta?: Partial<Record<keyof TacticalMetricsV2, number>>;
}

export interface DataCompletenessReport {
  totalAttributesExpected: number;
  knownAttributesCount: number;
  completenessScore: number; // 0-100%
  missingKeyAttributes: string[];
  dataConfidence: number; // 0-100%
}

export interface TacticAnalysisV2 {
  schemaVersion: 2;
  tacticalCohesion: number; // 0-100%
  cohesionGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  dataConfidence: number; // 0-100%
  dataCompleteness: DataCompletenessReport;
  phaseShape: PhaseShape;
  metrics: TacticalMetricsV2;
  findings: TacticalFindingV2[];
  fatalErrors: string[];
  hasCriticalDanger: boolean;
}

// 7. Simulation Snapshot & Result
export interface SimulationSnapshotV2 {
  schemaVersion: 2;
  hash: string;
  engineVersion: string;
  timestamp: number;
  formationId: string;
  slots: Array<{
    slotId: string;
    position: Position;
    x: number;
    y: number;
    roleId: string;
    duty: Duty;
    assignedPlayerId?: string;
    customPIs: PlayerInstructionType[];
  }>;
  teamInstructions: TeamInstructions;
  playerAttributesDigest: Record<string, Record<string, number | undefined>>;
}

export interface ScenarioResultV2 {
  scenarioId: string;
  opponentId: string;
  opponentName: string;
  opponentFormation: string;
  capacityTier: 'below' | 'equal' | 'above';
  userCapacityScore: number;
  opponentCapacityScore: number;
  winCount: number;
  drawCount: number;
  lossCount: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgXGFor: number;
  avgXGAgainst: number;
  avgPossession: number;
  matchupRating: number; // 0-100 tactical advantage (not raw win prob)
  topAdvantages: string[];
  topRisks: string[];
  decisivePhase: 'build_up' | 'midfield_press' | 'final_third' | 'transition';
  confidenceInterval: [number, number];
}

export interface SimulationResultV2 {
  snapshotHash: string;
  engineVersion: string;
  timestamp: number;
  totalMatches: number; // e.g. 48,000 (24 scenarios x 2,000)
  scenarios: ScenarioResultV2[];
  isOutdated: boolean;
}

// 8. Storage Model v2
export interface StorageStateV2 {
  schemaVersion: 2;
  squadName: string;
  players: PlayerV2[];
  currentFormationId: string;
  slots: SimulationSnapshotV2['slots'];
  teamInstructions: TeamInstructions;
  lastSimulationSnapshot?: SimulationSnapshotV2;
  lastSimulationResult?: SimulationResultV2;
  savedAt: number;
}
