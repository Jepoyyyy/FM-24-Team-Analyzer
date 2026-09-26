import { Player, RoleDefinition, TailoredPIRecommendation, TacticSlot } from '../types';

export function getTailoredPIRecommendations(
  player: Player,
  role: RoleDefinition,
  slot: TacticSlot,
  allSlots: TacticSlot[],
  playersMap: Map<string, Player>
): TailoredPIRecommendation[] {
  const recommendations: TailoredPIRecommendation[] = [];
  const attrs = player.attributes;

  // Helper cek apakah PI sudah hardcoded atau sudah di-custom
  const alreadyHasPI = (pi: string) =>
    role.hardcodedPIs.includes(pi as any) || slot.customPIs.includes(pi as any);

  // 1. Long Shots Specialist
  const longShots = attrs.longShots ?? 10;
  const technique = attrs.technique ?? 10;
  if (longShots >= 14 && technique >= 13 && (slot.position === 'MC' || slot.position === 'AMC' || slot.position === 'DM')) {
    if (!alreadyHasPI('shoot_more_often')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'shoot_more_often',
        tacticalBenefit: `Memaksimalkan atribut Long Shots (${longShots}) dan Teknik (${technique}) untuk menghasilkan gol tak terduga dari jarak jauh saat lawan bertahan rapat.`,
        triggeringAttributes: ['longShots', 'technique'],
      });
    }
  }

  // 2. High Passing/Vision on non-playmaker role
  const passing = attrs.passing ?? 10;
  const vision = attrs.vision ?? 10;
  const decisions = attrs.decisions ?? 10;
  if (passing >= 15 && vision >= 15 && decisions >= 13 && !role.id.includes('playmaker') && !role.id.includes('regista')) {
    if (!alreadyHasPI('take_more_risks')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'take_more_risks',
        tacticalBenefit: `Memanfaatkan Visi (${vision}) dan Passing (${passing}) elite untuk melepaskan umpan terobosan berisiko tinggi tanpa harus mengubah rolenya menjadi Playmaker murni.`,
        triggeringAttributes: ['passing', 'vision', 'decisions'],
      });
    }
  }

  // 3. Crossing Synergy (Far post vs Near post)
  const crossing = attrs.crossing ?? 10;
  if (crossing >= 14 && (slot.position === 'AMR' || slot.position === 'AML' || slot.position === 'DR' || slot.position === 'DL')) {
    // Cari striker
    const strikerSlots = allSlots.filter(s => s.position === 'STC' && s.assignedPlayerId);
    let hasTallStriker = false;
    let hasFastStriker = false;

    for (const stSlot of strikerSlots) {
      const st = playersMap.get(stSlot.assignedPlayerId!);
      if (st) {
        if ((st.attributes.jumpingReach ?? 10) >= 14) hasTallStriker = true;
        if ((st.attributes.acceleration ?? 10) >= 14) hasFastStriker = true;
      }
    }

    if (hasTallStriker && !alreadyHasPI('cross_aim_far_post')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'cross_aim_far_post',
        tacticalBenefit: `Arahkan umpan silang akurat (${crossing}) ke tiang jauh di mana striker jangkung kita memiliki keunggulan fisik atas bek sayap lawan.`,
        triggeringAttributes: ['crossing'],
      });
    } else if (hasFastStriker && !alreadyHasPI('cross_aim_near_post')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'cross_aim_near_post',
        tacticalBenefit: `Arahkan umpan silang ke tiang dekat untuk disambar oleh striker yang memiliki kecepatan reaksi tinggi.`,
        triggeringAttributes: ['crossing'],
      });
    }
  }

  // 4. Physical Hold Up Ball
  const strength = attrs.strength ?? 10;
  const balance = attrs.balance ?? 10;
  const composure = attrs.composure ?? 10;
  if (strength >= 14 && balance >= 14 && composure >= 13 && (slot.position === 'STC' || slot.position === 'AMC')) {
    if (!alreadyHasPI('hold_up_ball')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'hold_up_ball',
        tacticalBenefit: `Pemain memiliki kekuatan fisik (${strength}) untuk melindungi bola dari bek lawan, memberi waktu bagi rekan setim untuk maju membantu serangan.`,
        triggeringAttributes: ['strength', 'balance', 'composure'],
      });
    }
  }

  // 5. Clean & Aggressive Tackling
  const tackling = attrs.tackling ?? 10;
  const aggression = attrs.aggression ?? 10;
  if (tackling >= 15 && decisions >= 13 && aggression <= 13 && (slot.position === 'DM' || slot.position === 'MC' || slot.position === 'DC')) {
    if (!alreadyHasPI('tackle_harder')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'tackle_harder',
        tacticalBenefit: `Tackling elite (${tackling}) dan keputusan matang (${decisions}) memungkinkan pemain merebut bola secara agresif tanpa menimbulkan resiko kartu kuning/merah.`,
        triggeringAttributes: ['tackling', 'decisions'],
      });
    }
  }

  // 6. Channel Runner
  const offTheBall = attrs.offTheBall ?? 10;
  const pace = attrs.pace ?? 10;
  if (offTheBall >= 14 && pace >= 13 && (slot.position === 'AMR' || slot.position === 'AML' || slot.position === 'STC')) {
    if (!alreadyHasPI('move_into_channels')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'move_into_channels',
        tacticalBenefit: `Pemain memiliki Off The Ball (${offTheBall}) dan Kecepatan (${pace}) untuk aktif menyelinap ke celah antara bek tengah dan bek sayap lawan.`,
        triggeringAttributes: ['offTheBall', 'pace'],
      });
    }
  }

  // 7. Prevent Clumsy Dribbles
  const dribbling = attrs.dribbling ?? 10;
  const agility = attrs.agility ?? 10;
  if (dribbling <= 9 && agility <= 9 && slot.position !== 'GK') {
    if (!alreadyHasPI('dribble_less')) {
      recommendations.push({
        playerId: player.id,
        playerName: player.name,
        recommendedPI: 'dribble_less',
        tacticalBenefit: `Dribbling (${dribbling}) dan kelincahan rendah. Membatasi dribel mencegah pemain kehilangan bola di area berbahaya dan mendorong operan cepat.`,
        triggeringAttributes: ['dribbling', 'agility'],
      });
    }
  }

  return recommendations;
}
