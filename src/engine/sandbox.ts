import { TacticSlot, TeamInstructions, Player, SandboxOpponent, SandboxSimulationResult } from '../types';
import { getRoleById } from './roles';

export const SANDBOX_OPPONENTS: SandboxOpponent[] = [
  {
    id: '433_gegenpress',
    name: '4-3-3 DM Wide Gegenpress',
    formation: '4-3-3 DM',
    philosophy: 'High Intensity Gegenpress & Overload Flanks',
    keyThreats: ['Sayap Inverted menusuk tajam', 'High Pressing mematikan build-up', 'Transisi serangan kilat'],
    slots: [
      { position: 'GK', role: 'sk', duty: 'Support' },
      { position: 'DR', role: 'fb', duty: 'Attack' },
      { position: 'DC', role: 'bpd', duty: 'Defend' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DL', role: 'ifb', duty: 'Defend' },
      { position: 'DM', role: 'anchor', duty: 'Defend' },
      { position: 'MC', role: 'bbm', duty: 'Support' },
      { position: 'MC', role: 'mezzala', duty: 'Attack' },
      { position: 'AMR', role: 'winger', duty: 'Support' },
      { position: 'AML', role: 'inside_forward', duty: 'Attack' },
      { position: 'STC', role: 'af', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'higher',
      passingDirectness: 'shorter',
      lineOfEngagement: 'high_press',
      defensiveLine: 'higher',
      whenLostPossession: 'counter_press',
      whenWonPossession: 'counter',
    },
  },
  {
    id: '4231_highpress',
    name: '4-2-3-1 Modern High-Press',
    formation: '4-2-3-1 DM',
    philosophy: 'Creative Half-Space Overload & Playmaker Dominance',
    keyThreats: ['AMC bergerak bebas di antara lini', 'Overload kotak penalti dengan 4 penyerang', 'Double pivot solid'],
    slots: [
      { position: 'GK', role: 'sk', duty: 'Defend' },
      { position: 'DR', role: 'wb', duty: 'Support' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'bpd', duty: 'Defend' },
      { position: 'DL', role: 'wb', duty: 'Support' },
      { position: 'DM', role: 'dlp_dm', duty: 'Defend' },
      { position: 'DM', role: 'segundo_volante', duty: 'Attack' },
      { position: 'AMC', role: 'ap_amc', duty: 'Attack' },
      { position: 'AMR', role: 'inside_forward', duty: 'Support' },
      { position: 'AML', role: 'inside_forward', duty: 'Attack' },
      { position: 'STC', role: 'af', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'higher',
      passingDirectness: 'standard',
      lineOfEngagement: 'high_press',
      defensiveLine: 'higher',
      whenLostPossession: 'counter_press',
    },
  },
  {
    id: '442_direct_counter',
    name: '4-4-2 Flat Direct Counter',
    formation: '4-4-2 Flat',
    philosophy: 'Two Banks of Four, Pass Into Space, Aerial Crosses',
    keyThreats: ['2 striker fisik vs 2 bek tengah', 'Umpan silang dini dari garis tepi', 'Struktur pertahanan 8 pemain rapat'],
    slots: [
      { position: 'GK', role: 'gk', duty: 'Defend' },
      { position: 'DR', role: 'fb', duty: 'Defend' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'ncb', duty: 'Defend' },
      { position: 'DL', role: 'fb', duty: 'Defend' },
      { position: 'AMR', role: 'winger', duty: 'Attack' },
      { position: 'MC', role: 'bwm_cm', duty: 'Defend' },
      { position: 'MC', role: 'cm', duty: 'Support' },
      { position: 'AML', role: 'winger', duty: 'Attack' },
      { position: 'STC', role: 'target_forward', duty: 'Support' },
      { position: 'STC', role: 'poacher', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'much_higher',
      passingDirectness: 'direct',
      defensiveLine: 'lower',
      lineOfEngagement: 'low_block',
      passIntoSpace: true,
      earlyCrosses: true,
    },
  },
  {
    id: '352_wingback_counter',
    name: '3-5-2 / 5-3-2 Wing-Back Counter',
    formation: '5-3-2 WB',
    philosophy: 'Ultra-Solid 3 CB, Explosive Wing-Back Overlap',
    keyThreats: ['Wing-back overlap bebas tanpa kawalan', 'Trio lini tengah dominan', 'Transisi direct 2 striker'],
    slots: [
      { position: 'GK', role: 'sk', duty: 'Defend' },
      { position: 'DC', role: 'wcb', duty: 'Support' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'wcb', duty: 'Defend' },
      { position: 'DR', role: 'cwb', duty: 'Attack' },
      { position: 'DL', role: 'wb', duty: 'Attack' },
      { position: 'DM', role: 'anchor', duty: 'Defend' },
      { position: 'MC', role: 'bbm', duty: 'Support' },
      { position: 'MC', role: 'mezzala', duty: 'Attack' },
      { position: 'STC', role: 'dlf', duty: 'Support' },
      { position: 'STC', role: 'af', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'higher',
      passingDirectness: 'slightly_more_direct',
      whenWonPossession: 'counter',
      defensiveLine: 'standard',
    },
  },
  {
    id: '3421_box_midfield',
    name: '3-4-2-1 Box Midfield (Alonso Style)',
    formation: '3-4-2-1',
    philosophy: 'Fluid Box Midfield, Half-Space Suffocation',
    keyThreats: ['4 gelandang kotak mencekik lini tengah', '3 CB kokoh saat rest defence', 'Rotasi konstan nomor 10 ganda'],
    slots: [
      { position: 'GK', role: 'sk', duty: 'Support' },
      { position: 'DC', role: 'wcb', duty: 'Support' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'bpd', duty: 'Defend' },
      { position: 'DR', role: 'wb', duty: 'Attack' },
      { position: 'DL', role: 'wb', duty: 'Attack' },
      { position: 'DM', role: 'dlp_dm', duty: 'Defend' },
      { position: 'DM', role: 'dm', duty: 'Support' },
      { position: 'AMC', role: 'ap_amc', duty: 'Support' },
      { position: 'AMC', role: 'am_amc', duty: 'Attack' },
      { position: 'STC', role: 'af', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'standard',
      passingDirectness: 'shorter',
      lineOfEngagement: 'high_press',
      defensiveLine: 'higher',
    },
  },
  {
    id: '442_narrow_diamond',
    name: '4-4-2 Narrow Diamond (4-1-2-1-2)',
    formation: '4-1-2-1-2 Diamond',
    philosophy: 'Absolute Central Dominance, 4 vs 2 Midfield Overrun',
    keyThreats: ['Kalah jumlah telak di lini tengah sentral', 'Operan segitiga satu-dua cepat', 'Dua striker aktif'],
    slots: [
      { position: 'GK', role: 'sk', duty: 'Defend' },
      { position: 'DR', role: 'cwb', duty: 'Attack' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'bpd', duty: 'Defend' },
      { position: 'DL', role: 'cwb', duty: 'Attack' },
      { position: 'DM', role: 'anchor', duty: 'Defend' },
      { position: 'MC', role: 'bbm', duty: 'Support' },
      { position: 'MC', role: 'mezzala', duty: 'Support' },
      { position: 'AMC', role: 'ap_amc', duty: 'Attack' },
      { position: 'STC', role: 'af', duty: 'Attack' },
      { position: 'STC', role: 'dlf', duty: 'Support' },
    ],
    instructions: {
      tempo: 'higher',
      passingDirectness: 'shorter',
      attackingWidth: 'narrow',
    },
  },
  {
    id: '541_low_block',
    name: '5-4-1 Flat Low Block (Park The Bus)',
    formation: '5-4-1 Flat',
    philosophy: 'Grendel 5 Bek, Low Block, Time Wasting, Solitary Counter',
    keyThreats: ['Frustrasi kotak penalti tertutup rapat', 'Serangan balik kilat penyerang tunggal', 'Set piece berbahaya'],
    slots: [
      { position: 'GK', role: 'gk', duty: 'Defend' },
      { position: 'DR', role: 'fb', duty: 'Defend' },
      { position: 'DC', role: 'ncb', duty: 'Defend' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'ncb', duty: 'Defend' },
      { position: 'DL', role: 'fb', duty: 'Defend' },
      { position: 'AMR', role: 'dw', duty: 'Support' },
      { position: 'MC', role: 'bwm_cm', duty: 'Defend' },
      { position: 'MC', role: 'cm', duty: 'Support' },
      { position: 'AML', role: 'dw', duty: 'Support' },
      { position: 'STC', role: 'pf', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'much_lower',
      defensiveLine: 'much_lower',
      lineOfEngagement: 'low_block',
      defensiveTraps: 'trap_outside',
    },
  },
  {
    id: '424_all_out_attack',
    name: '4-2-4 Extreme Attack (Frontal Blitz)',
    formation: '4-2-4 Wide',
    philosophy: 'Frontal Overload, 4 Attackers on the Last Line',
    keyThreats: ['4 penyerang menekan garis belakang sekaligus', 'Sayap eksplosif', 'Banjir peluang cepat'],
    slots: [
      { position: 'GK', role: 'sk', duty: 'Defend' },
      { position: 'DR', role: 'wb', duty: 'Support' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DC', role: 'cd', duty: 'Defend' },
      { position: 'DL', role: 'wb', duty: 'Support' },
      { position: 'MC', role: 'bwm_cm', duty: 'Defend' },
      { position: 'MC', role: 'dlp_cm', duty: 'Support' },
      { position: 'AMR', role: 'winger', duty: 'Attack' },
      { position: 'AML', role: 'inside_forward', duty: 'Attack' },
      { position: 'STC', role: 'target_forward', duty: 'Attack' },
      { position: 'STC', role: 'af', duty: 'Attack' },
    ],
    instructions: {
      tempo: 'much_higher',
      passingDirectness: 'direct',
      lineOfEngagement: 'high_press',
    },
  },
];

export function runSandboxSimulation(
  userSlots: TacticSlot[],
  userInstructions: TeamInstructions,
  playersMap: Map<string, Player>
): SandboxSimulationResult[] {
  // 1. Hitung Matched Squad Capacity (Rata-rata rating Starting XI user)
  let totalKeyAttrScore = 0;
  let assignedCount = 0;

  for (const slot of userSlots) {
    if (!slot.assignedPlayerId) continue;
    const player = playersMap.get(slot.assignedPlayerId);
    if (!player) continue;

    const role = getRoleById(slot.roleId);
    if (!role) continue;

    let slotSum = 0;
    for (const attr of role.keyAttributes) {
      slotSum += player.attributes[attr] ?? 10;
    }
    totalKeyAttrScore += role.keyAttributes.length > 0 ? slotSum / role.keyAttributes.length : 10;
    assignedCount++;
  }

  // Rata-rata kualitas skuad user (skala 1-20, default 13 jika kosong)
  const userAvgRating = assignedCount > 0 ? totalKeyAttrScore / assignedCount : 13;

  const results: SandboxSimulationResult[] = [];

  // Hitung struktur formasi user
  const userCBs = userSlots.filter(s => s.position === 'DC');
  const userFullbacks = userSlots.filter(s => ['DR', 'DL', 'WBR', 'WBL'].includes(s.position));
  const userAttackingFullbacks = userFullbacks.filter(s => s.duty === 'Attack');
  const userDMs = userSlots.filter(s => s.position === 'DM');
  const userMCs = userSlots.filter(s => s.position === 'MC');
  const userHoldingMidfielders = userDMs.filter(s => s.roleId === 'anchor' || s.roleId === 'half_back' || (s.roleId === 'dm' && s.duty === 'Defend'));
  const userStrikers = userSlots.filter(s => s.position === 'STC');
  const userWingers = userSlots.filter(s => ['AMR', 'AML', 'MR', 'ML'].includes(s.position));

  for (const opponent of SANDBOX_OPPONENTS) {
    let baseTacticalScore = 50; // Neutral 50-50 start

    const rootCauses: SandboxSimulationResult['rootCauses'] = [];
    const enhancements: SandboxSimulationResult['actionableEnhancements'] = [];

    // Indeks Evaluasi
    let flankVulnerability = 50;
    let centralDominance = 50;
    let restDefenceStability = 50;
    let aerialDominance = 50;
    let pressingEscape = 50;

    // ================= SPECIFIC MATCHUP EVALUATION =================

    // Case 1: Lawan 4-4-2 Flat Direct Counter
    if (opponent.id === '442_direct_counter') {
      // 4-4-2 punya 2 striker maut vs CB user
      if (userCBs.length <= 2 && userAttackingFullbacks.length >= 2 && userHoldingMidfielders.length === 0) {
        baseTacticalScore -= 24;
        restDefenceStability -= 35;
        flankVulnerability -= 25;
        rootCauses.push({
          title: 'Rest Defence Runtuh Melawan 2 Striker Direct',
          explanation: 'Kedua Fullback Anda maju menyerang bersamaan tanpa adanya DM penahan. Lawan memiliki 2 Striker fisik yang langsung menyerang 2 CB Anda dalam situasi 2 vs 2 tanpa cover.',
          flawCategory: 'rest_defence_collapse',
        });
        enhancements.push({
          type: 'role_tweak',
          action: 'Ubah salah satu bek sayap menjadi Inverted Full-Back (Defend) agar saat menyerang otomatis membentuk 3 CB.',
          expectedImpact: 'Menaikkan stabilitas Rest Defence hingga +35% dan mengunci duel 2 striker lawan.',
        });
        enhancements.push({
          type: 'team_instruction_tweak',
          action: 'Aktifkan instruksi Stop Crosses dan turunkan garis pertahanan ke Standard Line.',
          expectedImpact: 'Mengurangi ancaman umpan silang dini ke Target Man lawan.',
        });
      }
    }

    // Case 2: Lawan 4-3-3 DM Gegenpress
    if (opponent.id === '433_gegenpress') {
      if (userInstructions.playOutOfDefence) {
        // Cek apakah bek user composure & passing tinggi
        const cbPanic = userCBs.some(s => {
          const p = s.assignedPlayerId ? playersMap.get(s.assignedPlayerId) : undefined;
          return p && ((p.attributes.composure ?? 10) < 11 || (p.attributes.passing ?? 10) < 11);
        });
        if (cbPanic) {
          baseTacticalScore -= 18;
          pressingEscape -= 30;
          rootCauses.push({
            title: 'Terperangkap High Press Lawan di Kotak Sendiri',
            explanation: 'Instruksi Play Out of Defence Anda dimangsa oleh Gegenpress intensif lawan. Bek tengah Anda rentan panik dan melakukan blunder di sepertiga pertahanan.',
            flawCategory: 'pressing_trap',
          });
          enhancements.push({
            type: 'team_instruction_tweak',
            action: 'Matikan Play Out of Defence dan naikkan tempo operan menjadi Slightly More Direct.',
            expectedImpact: 'Melepaskan bola cepat melewati blokade pressing garis depan lawan.',
          });
        }
      }
    }

    // Case 3: Lawan 4-4-2 Narrow Diamond
    if (opponent.id === '442_narrow_diamond') {
      const userTotalMidfield = userDMs.length + userMCs.length;
      if (userTotalMidfield <= 2) {
        baseTacticalScore -= 20;
        centralDominance -= 35;
        rootCauses.push({
          title: 'Kalah Jumlah Telak di Lini Tengah (2 vs 4 Midfielders)',
          explanation: 'Formasi Anda hanya memiliki 2 gelandang sentral menghadapi 4 gelandang diamond lawan. Aliran bola Anda tercekik total di sepertiga tengah.',
          flawCategory: 'midfield_overrun',
        });
        enhancements.push({
          type: 'role_tweak',
          action: 'Ubah salah satu bek sayap menjadi Inverted Wing-Back (Support) untuk menambah jumlah pemain di lini tengah saat build-up.',
          expectedImpact: 'Mencegah overload 4 gelandang lawan di sektor sentral.',
        });
        enhancements.push({
          type: 'team_instruction_tweak',
          action: 'Fokuskan serangan ke sayap (Focus Play Down The Flanks) untuk mengeksploitasi tidak adanya pemain sayap pada 4-4-2 Diamond lawan.',
          expectedImpact: 'Memaksa diamond lawan tertarik melebar dan kehilangan kerapatan tengah.',
        });
      }
    }

    // Case 4: Lawan 5-4-1 Low Block "Park the Bus"
    if (opponent.id === '541_low_block') {
      if (userInstructions.tempo === 'lower' || userInstructions.tempo === 'much_lower') {
        baseTacticalScore -= 15;
        rootCauses.push({
          title: 'Serangan Buntu Menghadapi Low Block Ultra-Rapat',
          explanation: 'Tempo permainan Anda yang lambat memberi waktu berlimpah bagi lawan untuk menumpuk 9 pemain di kotak penalti mereka, memicu penguasaan bola steril tanpa gol.',
          flawCategory: 'flank_exposure',
        });
        enhancements.push({
          type: 'team_instruction_tweak',
          action: 'Naikkan tempo menjadi Higher, aktifkan Work Ball Into Box, dan lebarkan serangan (Fairly Wide).',
          expectedImpact: 'Meregangkan 5 bek lawan dan mencari celah dari umpan tarik cutback.',
        });
      }
    }

    // Case 5: Lawan 3-5-2 / 5-3-2 Wing-Back Counter
    if (opponent.id === '352_wingback_counter') {
      if (userWingers.length === 0 && userAttackingFullbacks.length >= 2) {
        baseTacticalScore -= 16;
        flankVulnerability -= 25;
        rootCauses.push({
          title: 'Ruang di Belakang Bek Sayap Dieksploitasi 2 Wing-Back Lawan',
          explanation: 'Wing-back lawan bebas berlari melakukan serangan balik ke koridor samping yang ditinggalkan bek sayap Anda.',
          flawCategory: 'flank_exposure',
        });
        enhancements.push({
          type: 'role_tweak',
          action: 'Pasang pemain di posisi sayap (Winger / Defensive Winger) atau turunkan tugas fullback menjadi Support.',
          expectedImpact: 'Menutup kebebasan sprint wing-back lawan di tepi lapangan.',
        });
      }
    }

    // Default jika taktik seimbang dan tidak ada masalah kritis
    if (rootCauses.length === 0) {
      baseTacticalScore += 12;
      flankVulnerability += 10;
      centralDominance += 10;
      restDefenceStability += 10;
    }

    // Komputasi Probabilitas Win / Draw / Loss
    const clampedScore = Math.min(85, Math.max(15, baseTacticalScore));
    const winProb = Math.round(clampedScore);
    const drawProb = Math.round((100 - winProb) * 0.35);
    const lossProb = 100 - winProb - drawProb;

    let dominantOutcome: 'win' | 'draw' | 'loss' = 'win';
    if (winProb < 40) dominantOutcome = 'loss';
    else if (winProb >= 40 && winProb <= 52) dominantOutcome = 'draw';

    results.push({
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentFormation: opponent.formation,
      winProbability: winProb,
      drawProbability: drawProb,
      lossProbability: lossProb,
      dominantOutcome,
      scores: {
        flankVulnerability: Math.min(100, Math.max(10, flankVulnerability)),
        centralDominance: Math.min(100, Math.max(10, centralDominance)),
        restDefenceStability: Math.min(100, Math.max(10, restDefenceStability)),
        aerialDominance: Math.min(100, Math.max(10, aerialDominance)),
        pressingEscape: Math.min(100, Math.max(10, pressingEscape)),
      },
      rootCauses,
      actionableEnhancements: enhancements,
    });
  }

  return results;
}
