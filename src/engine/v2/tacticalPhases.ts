import { TacticSlot, TeamInstructions } from '../../types';
import {
  PhasePlayerState,
  PitchCoordinate,
  TacticalPhaseId,
  TacticalPhaseModel,
  TacticalPhaseState,
} from './types';
import { derive4PhaseShape } from './phaseShape';
import { getRoleDutyProfile } from './roleDutyProfiles';

const PHASE_LABELS: Record<TacticalPhaseId, string> = {
  build_up: 'Build-up awal',
  progression: 'Progression lini tengah',
  final_third: 'Serangan sepertiga akhir',
  attacking_transition: 'Transisi menyerang',
  defensive_transition: 'Transisi bertahan',
  settled_defence: 'Blok bertahan mapan',
};

const clamp = (value: number) => Math.max(4, Math.min(96, Math.round(value)));

function between(from: PitchCoordinate, to: PitchCoordinate, progress: number): PitchCoordinate {
  return {
    x: clamp(from.x + (to.x - from.x) * progress),
    y: clamp(from.y + (to.y - from.y) * progress),
  };
}

function functionsFor(slot: TacticSlot, phase: TacticalPhaseId): string[] {
  const profile = getRoleDutyProfile(slot.roleId, slot.duty);
  if (!profile) return ['Perilaku role-duty belum terpetakan'];

  if (phase === 'build_up') {
    return [profile.possession.progressionRole, profile.possession.ballAttraction];
  }
  if (phase === 'progression') {
    return [profile.possession.progressionRole, profile.movement.lateralMovement];
  }
  if (phase === 'final_third') {
    return [profile.movement.boxRuns, profile.possession.crossing];
  }
  if (phase === 'attacking_transition') return [profile.transition.offensiveTransition];
  if (phase === 'defensive_transition') return [profile.transition.defensiveTransition];
  return [profile.defensive.screening, profile.defensive.pressingIntensity];
}

function shapeOf(players: PhasePlayerState[], slots: TacticSlot[]): string {
  const goalkeeperIds = new Set(slots.filter(slot => slot.position === 'GK').map(slot => slot.slotId));
  const outfield = players.filter(player => !goalkeeperIds.has(player.slotId));
  const defenders = outfield.filter(player => player.coordinate.y >= 70).length;
  const midfielders = outfield.filter(player => player.coordinate.y >= 42 && player.coordinate.y < 70).length;
  const attackers = outfield.filter(player => player.coordinate.y < 42).length;
  return `${defenders}-${midfielders}-${attackers}`;
}

/**
 * Projects one tactic through six observable football phases. Coordinates are
 * explanatory zones, not a claim about Sports Interactive's hidden ME values.
 */
export function deriveTacticalPhaseModel(
  slots: TacticSlot[],
  instructions: TeamInstructions
): TacticalPhaseModel {
  const fourPhase = derive4PhaseShape(slots, instructions);
  const bySlot = new Map(fourPhase.playerCoords.map(player => [player.slotId, player]));

  const phaseCoordinates: Record<TacticalPhaseId, (slot: TacticSlot) => PitchCoordinate> = {
    build_up: slot => {
      const player = bySlot.get(slot.slotId)!;
      return between(player.base, player.inPossession, 0.35);
    },
    progression: slot => {
      const player = bySlot.get(slot.slotId)!;
      return between(player.base, player.inPossession, 0.7);
    },
    final_third: slot => bySlot.get(slot.slotId)!.inPossession,
    attacking_transition: slot => bySlot.get(slot.slotId)!.attackingTransition,
    defensive_transition: slot => bySlot.get(slot.slotId)!.defensiveTransition,
    settled_defence: slot => bySlot.get(slot.slotId)!.settledDefence,
  };

  const phases = Object.fromEntries(
    (Object.keys(PHASE_LABELS) as TacticalPhaseId[]).map(id => {
      const players = slots.map(slot => {
        const profile = getRoleDutyProfile(slot.roleId, slot.duty);
        return {
          slotId: slot.slotId,
          coordinate: phaseCoordinates[id](slot),
          functions: functionsFor(slot, id),
          confidence: profile?.evidence?.confidence ?? 'medium',
        } satisfies PhasePlayerState;
      });
      return [id, { id, label: PHASE_LABELS[id], shape: shapeOf(players, slots), players } satisfies TacticalPhaseState];
    })
  ) as Record<TacticalPhaseId, TacticalPhaseState>;

  return {
    phases,
    restDefenceShape: fourPhase.restDefenceShape,
    assumptions: [
      'Koordinat menunjukkan zona perilaku relatif, bukan koordinat internal Match Engine FM24.',
      'Build-up dan progression diproyeksikan dari posisi dasar menuju posisi in-possession role-duty.',
      'Instruksi, mentality, pemain, lawan, dan keadaan pertandingan dapat mengubah realisasi gerakan.',
    ],
  };
}
