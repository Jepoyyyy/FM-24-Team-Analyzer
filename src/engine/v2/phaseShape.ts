import { TacticSlot, TeamInstructions } from '../../types';
import { PhaseShape, PlayerPhaseCoords, PitchCoordinate } from './types';
import { getRoleDutyProfile } from './roleDutyProfiles';

export function derive4PhaseShape(
  slots: TacticSlot[],
  instructions: TeamInstructions
): PhaseShape {
  const playerCoords: PlayerPhaseCoords[] = [];

  // Identify key structural components
  const cbs = slots.filter(s => s.position === 'DC');
  const dms = slots.filter(s => s.position === 'DM');
  const mcs = slots.filter(s => s.position === 'MC');
  const amcs = slots.filter(s => s.position === 'AMC');
  const strikers = slots.filter(s => s.position === 'STC');
  const fullbacks = slots.filter(s => ['DR', 'DL', 'WBR', 'WBL'].includes(s.position));

  let restDefenceCount = 0;

  for (const slot of slots) {
    const profile = getRoleDutyProfile(slot.roleId, slot.duty);
    const base: PitchCoordinate = { x: slot.x, y: slot.y };

    let inPoss: PitchCoordinate = { ...base };
    let defence: PitchCoordinate = { ...base };
    let atkTransition: PitchCoordinate = { ...base };
    let defTransition: PitchCoordinate = { ...base };
    let isRestDefence = false;

    const pos = slot.position;
    const duty = slot.duty;
    const roleId = slot.roleId;

    // -------------------------------------------------------------
    // 1. IN-POSSESSION COORDINATE DERIVATION
    // -------------------------------------------------------------
    if (pos === 'GK') {
      inPoss = roleId === 'sk' ? { x: 50, y: 84 } : { x: 50, y: 90 };
      defence = { x: 50, y: 92 };
      isRestDefence = false;
    } else if (pos === 'DC') {
      isRestDefence = true;
      restDefenceCount++;
      if (profile?.duty === 'Stopper') {
        inPoss = { x: base.x, y: 70 };
      } else {
        inPoss = { x: base.x, y: 76 };
      }
      defence = { x: base.x, y: instructions.defensiveLine === 'much_lower' || instructions.defensiveLine === 'lower' ? 84 : 78 };
    } else if (pos === 'DR' || pos === 'DL') {
      if (roleId === 'ifb') {
        // Tucks into back 3
        isRestDefence = true;
        restDefenceCount++;
        inPoss = pos === 'DR' ? { x: 68, y: 76 } : { x: 32, y: 76 };
        defence = { x: base.x, y: 78 };
      } else if (roleId === 'iwb') {
        // Inverts into midfield pivot
        inPoss = pos === 'DR' ? { x: 60, y: 55 } : { x: 40, y: 55 };
        defence = { x: base.x, y: 76 };
        if (duty === 'Defend') {
          isRestDefence = true;
          restDefenceCount++;
        }
      } else if (duty === 'Attack') {
        // High overlapping winger
        inPoss = { x: pos === 'DR' ? 88 : 12, y: 26 };
        defence = { x: base.x, y: 76 };
      } else if (duty === 'Support') {
        inPoss = { x: pos === 'DR' ? 84 : 16, y: 48 };
        defence = { x: base.x, y: 76 };
      } else {
        // Defend duty: stays back in rest defence
        isRestDefence = true;
        restDefenceCount++;
        inPoss = { x: base.x, y: 72 };
        defence = { x: base.x, y: 78 };
      }
    } else if (pos === 'WBR' || pos === 'WBL') {
      if (duty === 'Attack') {
        inPoss = { x: pos === 'WBR' ? 88 : 12, y: 24 };
      } else {
        inPoss = { x: pos === 'WBR' ? 84 : 16, y: 44 };
      }
      defence = { x: pos === 'WBR' ? 82 : 18, y: 74 };
    } else if (pos === 'DM') {
      if (roleId === 'half_back') {
        isRestDefence = true;
        restDefenceCount++;
        inPoss = { x: 50, y: 80 }; // Drops between CBs
        defence = { x: 50, y: 72 };
      } else if (roleId === 'anchor' || duty === 'Defend') {
        isRestDefence = true;
        restDefenceCount++;
        inPoss = { x: base.x, y: 62 };
        defence = { x: base.x, y: 68 };
      } else if (roleId === 'segundo_volante' && duty === 'Attack') {
        inPoss = { x: base.x, y: 28 }; // Surges into penalty box
        defence = { x: base.x, y: 66 };
      } else {
        inPoss = { x: base.x, y: 52 };
        defence = { x: base.x, y: 66 };
      }
    } else if (pos === 'MC') {
      if (roleId === 'mezzala' && duty === 'Attack') {
        inPoss = { x: base.x > 50 ? 70 : 30, y: 24 }; // Attacks half-space
        defence = { x: base.x, y: 58 };
      } else if (duty === 'Attack') {
        inPoss = { x: base.x, y: 26 };
        defence = { x: base.x, y: 58 };
      } else if (roleId === 'bbm') {
        inPoss = { x: base.x, y: 38 };
        defence = { x: base.x, y: 56 };
      } else if (duty === 'Defend') {
        isRestDefence = true;
        restDefenceCount++;
        inPoss = { x: base.x, y: 56 };
        defence = { x: base.x, y: 64 };
      } else {
        inPoss = { x: base.x, y: 44 };
        defence = { x: base.x, y: 56 };
      }
    } else if (pos === 'AMC') {
      if (roleId === 'shadow_striker') {
        inPoss = { x: 50, y: 16 }; // Joins striker in the box
        defence = { x: 50, y: 48 };
      } else {
        inPoss = { x: base.x, y: 25 };
        defence = { x: base.x, y: 48 };
      }
    } else if (pos === 'AMR' || pos === 'AML') {
      if (roleId === 'inside_forward' || roleId === 'inverted_winger') {
        inPoss = { x: pos === 'AMR' ? 66 : 34, y: 18 }; // Cuts into box
      } else {
        inPoss = { x: pos === 'AMR' ? 88 : 12, y: 22 }; // Hugs byline
      }
      defence = { x: pos === 'AMR' ? 80 : 20, y: 54 }; // Drops to settled block
    } else if (pos === 'MR' || pos === 'ML') {
      inPoss = { x: pos === 'MR' ? 86 : 14, y: 30 };
      defence = { x: pos === 'MR' ? 82 : 18, y: 58 };
    } else if (pos === 'STC') {
      if (roleId === 'dlf' && duty === 'Support') {
        inPoss = { x: base.x, y: 25 }; // Drops deep to link play
      } else if (roleId === 'false_nine') {
        inPoss = { x: base.x, y: 28 };
      } else {
        inPoss = { x: base.x, y: 14 }; // Pins CBs
      }
      defence = { x: base.x, y: 40 }; // First line of engagement
    }

    // Transitions
    atkTransition = {
      x: Math.round((base.x + inPoss.x) / 2),
      y: Math.round((base.y + inPoss.y) / 2),
    };

    defTransition = {
      x: Math.round((inPoss.x + defence.x) / 2),
      y: Math.round((inPoss.y + defence.y) / 2),
    };

    playerCoords.push({
      slotId: slot.slotId,
      position: pos,
      roleId,
      duty,
      base,
      inPossession: inPoss,
      settledDefence: defence,
      attackingTransition: atkTransition,
      defensiveTransition: defTransition,
      isRestDefence,
    });
  }

  // -------------------------------------------------------------
  // 2. DERIVE BASE SHAPE NAME
  // -------------------------------------------------------------
  const defCount = fullbacks.length + cbs.length;
  const dmCount = dms.length;
  const midCount = mcs.length + slots.filter(s => s.position === 'ML' || s.position === 'MR').length;
  const amCount = amcs.length + slots.filter(s => s.position === 'AML' || s.position === 'AMR').length;
  const stCount = strikers.length;

  let baseShape = `${defCount}-${midCount + dmCount}-${amCount}-${stCount}`;
  if (defCount === 4 && dmCount === 1 && midCount === 2 && amCount === 2 && stCount === 1) {
    baseShape = '4-3-3';
  } else if (defCount === 4 && dmCount === 2 && amCount === 3 && stCount === 1) {
    baseShape = '4-2-3-1';
  } else if (defCount === 4 && midCount === 4 && stCount === 2) {
    baseShape = '4-4-2';
  } else if (defCount === 5 && midCount === 3 && stCount === 2) {
    baseShape = '5-3-2';
  } else if (defCount === 3 && (midCount + dmCount) === 4 && amCount === 2 && stCount === 1) {
    baseShape = '3-4-2-1';
  }

  // -------------------------------------------------------------
  // 3. DERIVE IN-POSSESSION SHAPE NOTATION (e.g. 3-2-5 or 2-3-5)
  // -------------------------------------------------------------
  // Sort outfield players by inPossession Y coordinate (descending from defenders to attackers)
  const outfieldCoords = playerCoords.filter(p => p.position !== 'GK');
  const lineDefenders = outfieldCoords.filter(p => p.inPossession.y >= 70).length;
  const lineMidfield = outfieldCoords.filter(p => p.inPossession.y >= 45 && p.inPossession.y < 70).length;
  const lineAttackers = outfieldCoords.filter(p => p.inPossession.y < 45).length;

  const inPossessionShape = `${lineDefenders}-${lineMidfield}-${lineAttackers}`;

  // -------------------------------------------------------------
  // 4. DERIVE SETTLED DEFENCE BLOCK (e.g. 4-4-2 or 4-5-1 or 5-4-1)
  // -------------------------------------------------------------
  const defBackline = outfieldCoords.filter(p => p.settledDefence.y >= 70).length;
  const defMidline = outfieldCoords.filter(p => p.settledDefence.y >= 50 && p.settledDefence.y < 70).length;
  const defFrontline = outfieldCoords.filter(p => p.settledDefence.y < 50).length;

  const settledDefenceShape = `${defBackline}-${defMidline}-${defFrontline}`;

  // -------------------------------------------------------------
  // 5. REST DEFENCE NOTATION (e.g. 3+2 or 3+1 or 2+3)
  // -------------------------------------------------------------
  const restDefFirstLine = outfieldCoords.filter(p => p.isRestDefence && p.inPossession.y >= 74).length;
  const restDefSecondLine = outfieldCoords.filter(p => p.isRestDefence && p.inPossession.y < 74).length;
  const restDefenceShape = `${restDefFirstLine}+${restDefSecondLine}`;

  return {
    baseShape,
    inPossessionShape,
    settledDefenceShape,
    restDefenceShape,
    restDefenceCount,
    playerCoords,
  };
}
