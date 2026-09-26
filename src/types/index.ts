// 1. Posisi & Peran Dasar FM24
export type Position =
  | 'GK'
  | 'DR' | 'DL' | 'DC' | 'WBR' | 'WBL'
  | 'DM' | 'MC' | 'MR' | 'ML'
  | 'AMR' | 'AML' | 'AMC'
  | 'STC';

export type Duty = 'Defend' | 'Support' | 'Attack' | 'Stopper' | 'Cover' | 'Automatic';
export type Severity = 'info' | 'warning' | 'danger';

// 2. Kamus Player Instructions (PI)
export type PlayerInstructionType =
  | 'take_more_risks' | 'fewer_risky_passes'
  | 'shoot_more_often' | 'shoot_less_often'
  | 'dribble_more' | 'dribble_less'
  | 'cross_more_often' | 'cross_less_often'
  | 'cross_aim_near_post' | 'cross_aim_far_post' | 'cross_aim_target_forward'
  | 'stay_wider' | 'sit_narrower'
  | 'move_into_channels' | 'roam_from_position' | 'hold_position'
  | 'get_further_forward' | 'hold_up_ball'
  | 'close_down_more' | 'close_down_less'
  | 'tackle_harder' | 'ease_off_tackles'
  | 'mark_tighter'
  | 'cut_inside_with_ball' | 'run_wide_with_ball'
  | 'drop_deeper';

export type PositionalFamiliarity = 'Natural' | 'Accomplished' | 'Unconvincing' | 'Awkward';

// 3. Model Pemain
export interface Player {
  id: string;
  name: string;
  age: number;
  club?: string;
  nationality?: string;
  positions: {
    position: Position;
    familiarity: PositionalFamiliarity;
  }[];
  attributes: Record<string, number>; // Technical, Mental, Physical (skala 1-20)
  traits?: string[];
}

// 4. Definisi Role Resmi FM24
export interface RoleDefinition {
  id: string;
  name: string;
  code: string;
  position: Position;
  availableDuties: Duty[];
  keyAttributes: string[];
  desirableAttributes: string[];
  hardcodedPIs: PlayerInstructionType[];
  incompatiblePIs: PlayerInstructionType[];
  description: string;
}

// 5. Model Slot Taktik di Lapangan
export interface TacticSlot {
  slotId: string;
  position: Position;
  x: number; // Persentase posisi lapangan X (0-100 dari kiri ke kanan)
  y: number; // Persentase posisi lapangan Y (0-100 dari bawah/GK ke atas/ST)
  roleId: string;
  duty: Duty;
  assignedPlayerId?: string;
  customPIs: PlayerInstructionType[];
}

export type Mentality =
  | 'very_defensive'
  | 'defensive'
  | 'cautious'
  | 'balanced'
  | 'positive'
  | 'attacking'
  | 'very_attacking';

// 6. Instruksi Tim (Team Instructions)
export interface TeamInstructions {
  // Mentality (Filosofi Risiko & Intensitas)
  mentality: Mentality;

  // In Possession
  attackingWidth: 'narrow' | 'fairly_narrow' | 'standard' | 'fairly_wide' | 'wide';
  tempo: 'much_lower' | 'lower' | 'standard' | 'higher' | 'much_higher';
  passingDirectness: 'shorter' | 'slightly_shorter' | 'standard' | 'slightly_more_direct' | 'direct';
  playOutOfDefence: boolean;
  passIntoSpace: boolean;
  workBallIntoBox: boolean;
  playForSetPieces: boolean;
  dribbleMode: 'dribble_less' | 'standard' | 'run_at_defence';
  creativeFreedom: 'more_disciplined' | 'standard' | 'more_expressive';
  focusPlay: 'left' | 'right' | 'middle' | 'flanks' | 'balanced';
  overlapLeft: boolean;
  overlapRight: boolean;
  underlapLeft: boolean;
  underlapRight: boolean;
  crossType: 'mixed' | 'low' | 'floated' | 'whipped';
  earlyCrosses: boolean;

  // In Transition
  whenLostPossession: 'counter_press' | 'regroup' | 'hold_shape';
  whenWonPossession: 'counter' | 'hold_shape';
  gkDistributionPace: 'distribute_quickly' | 'distribute_slowly' | 'standard';
  gkDistributionType: 'roll_out' | 'short_kicks' | 'long_kicks' | 'throw_long' | 'unspecified';

  // Out of Possession
  defensiveLine: 'much_lower' | 'lower' | 'standard' | 'higher' | 'much_higher';
  lineOfEngagement: 'low_block' | 'mid_block' | 'high_press';
  pressingIntensity: 'less_often' | 'standard' | 'more_often' | 'much_more_often';
  preventShortGkDistribution: boolean;
  tackling: 'stay_on_feet' | 'standard' | 'get_stuck_in';
  defensiveTraps: 'trap_inside' | 'trap_outside' | 'neutral';
  crossPrevention: 'invite_crosses' | 'stop_crosses' | 'neutral';
}

export const DEFAULT_TEAM_INSTRUCTIONS: TeamInstructions = {
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
  crossType: 'mixed',
  earlyCrosses: false,

  whenLostPossession: 'counter_press',
  whenWonPossession: 'counter',
  gkDistributionPace: 'standard',
  gkDistributionType: 'roll_out',

  defensiveLine: 'higher',
  lineOfEngagement: 'high_press',
  pressingIntensity: 'more_often',
  preventShortGkDistribution: true,
  tackling: 'standard',
  defensiveTraps: 'trap_outside',
  crossPrevention: 'stop_crosses',
};

// 7. Model Masalah Taktik (Guideline Guard Issue)
export interface TacticalIssue {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category:
    | 'structure_integrity'
    | 'space_clash'
    | 'duty_balance'
    | 'player_capacity'
    | 'instruction_conflict'
    | 'pi_ti_clash';
  affectedPositions?: Position[];
  suggestedFix: string;
  autoFixAction?: {
    type: 'change_role' | 'change_duty' | 'change_ti' | 'remove_pi';
    slotId?: string;
    newRoleId?: string;
    newDuty?: Duty;
    tiKey?: keyof TeamInstructions;
    tiValue?: unknown;
  };
}

// 8. Model Rekomendasi PI Khusus Pemain
export interface TailoredPIRecommendation {
  playerId: string;
  playerName: string;
  recommendedPI: PlayerInstructionType;
  tacticalBenefit: string;
  triggeringAttributes: string[];
}

// 9. Template Formasi
export interface FormationTemplate {
  id: string;
  name: string;
  category: '4_back' | '3_5_back' | 'narrow' | 'asymmetric';
  description: string;
  slots: Omit<TacticSlot, 'assignedPlayerId' | 'customPIs'>[];
  defaultInstructions?: Partial<TeamInstructions>;
}

// 10. Sandbox Opponent & Results
export type OpponentArchetypeId =
  | '433_gegenpress'
  | '4231_highpress'
  | '442_direct_counter'
  | '352_wingback_counter'
  | '3421_box_midfield'
  | '442_narrow_diamond'
  | '541_low_block'
  | '424_all_out_attack';

export interface SandboxOpponent {
  id: OpponentArchetypeId;
  name: string;
  formation: string;
  philosophy: string;
  keyThreats: string[];
  slots: { position: Position; role: string; duty: Duty }[];
  instructions: Partial<TeamInstructions>;
}

export interface SandboxSimulationResult {
  opponentId: OpponentArchetypeId;
  opponentName: string;
  opponentFormation: string;
  winProbability: number;   // 0 - 100%
  drawProbability: number;  // 0 - 100%
  lossProbability: number;  // 0 - 100%
  dominantOutcome: 'win' | 'draw' | 'loss';
  scores: {
    flankVulnerability: number;
    centralDominance: number;
    restDefenceStability: number;
    aerialDominance: number;
    pressingEscape: number;
  };
  rootCauses: {
    title: string;
    explanation: string;
    flawCategory: 'flank_exposure' | 'midfield_overrun' | 'rest_defence_collapse' | 'aerial_weakness' | 'pressing_trap';
  }[];
  actionableEnhancements: {
    type: 'role_tweak' | 'team_instruction_tweak' | 'player_instruction_tweak';
    action: string;
    expectedImpact: string;
  }[];
}
