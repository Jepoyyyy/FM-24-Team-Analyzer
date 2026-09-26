import { Player, FormationTemplate, TacticSlot, Position } from '../types';
import { FORMATION_TEMPLATES } from './formations';
import { ALL_ROLES, getRoleById } from './roles';
import { calculateRoleSuitability } from './suitability';

export interface FormationRecommendation {
  template: FormationTemplate;
  matchScore: number; // 0 - 100%
  reasoning: {
    title: string;
    description: string;
    type: 'flank' | 'midfield' | 'attack' | 'defence' | 'risk';
  }[];
  suggestedSlots: TacticSlot[];
  isAsymmetric: boolean;
  squadSummary: {
    startingXIScore: number;
    flankBalance: string;
    restDefenceStructure: string;
    keyPlayers: string[];
  };
}

export function recommendFormations(
  players: Player[]
): FormationRecommendation[] {
  if (players.length < 11) {
    return [];
  }

  // Identifikasi profil pemain kunci berdasarkan atribut nyata skuad
  const findBestInPositions = (posList: Position[], attrKey?: string) => {
    return players
      .filter(p => p.positions.some(pos => posList.includes(pos.position)))
      .sort((a, b) => {
        const valA = attrKey ? (a.attributes[attrKey] ?? 0) : 0;
        const valB = attrKey ? (b.attributes[attrKey] ?? 0) : 0;
        return valB - valA;
      });
  };

  const drPlayers = findBestInPositions(['DR'], 'tackling');
  const dlPlayers = findBestInPositions(['DL'], 'crossing');
  const cbPlayers = findBestInPositions(['DC'], 'tackling');
  const dmPlayers = findBestInPositions(['DM'], 'tackling');
  const amrPlayers = findBestInPositions(['AMR', 'MR'], 'dribbling');
  const amlPlayers = findBestInPositions(['AML', 'ML'], 'dribbling');
  const amcPlayers = findBestInPositions(['AMC'], 'vision');
  const stPlayers = findBestInPositions(['STC'], 'finishing');

  const bestDR = drPlayers[0];
  const bestDL = dlPlayers[0];
  const bestDM = dmPlayers[0];
  const bestAMC = amcPlayers[0];
  const bestAMR = amrPlayers[0];
  const bestAML = amlPlayers[0];

  // Flank dynamics assessment
  const isRightDefensive = bestDR && (bestDR.attributes.tackling ?? 10) >= 14 && (bestDR.attributes.crossing ?? 10) <= 12;
  const isLeftAttacking = bestDL && (bestDL.attributes.pace ?? 10) >= 14 && (bestDL.attributes.crossing ?? 10) >= 13;
  const hasEliteNo10 = bestAMC && (bestAMC.attributes.vision ?? 10) >= 16;
  const hasAnchorDM = bestDM && (bestDM.attributes.tackling ?? 10) >= 16;

  const recommendations: FormationRecommendation[] = [];

  for (const template of FORMATION_TEMPLATES) {
    let totalScore = 0;
    const assignedPlayerIds = new Set<string>();
    const suggestedSlots: TacticSlot[] = [];
    const reasoningList: { title: string; description: string; type: 'flank' | 'midfield' | 'attack' | 'defence' | 'risk' }[] = [];
    const keyPlayerNames: string[] = [];

    // Prioritaskan mengisi slot dengan pemain terbaik
    for (const slot of template.slots) {
      let bestPlayer: Player | undefined;
      let bestScore = -1;
      let bestRole = getRoleById(slot.roleId) || ALL_ROLES[0];

      for (const player of players) {
        if (assignedPlayerIds.has(player.id)) continue;

        const role = getRoleById(slot.roleId) || ALL_ROLES.find(r => r.position === slot.position) || ALL_ROLES[0];
        const res = calculateRoleSuitability(player, role, slot.position);

        if (res.score > bestScore) {
          bestScore = res.score;
          bestPlayer = player;
          bestRole = role;
        }
      }

      if (bestPlayer) {
        assignedPlayerIds.add(bestPlayer.id);
        totalScore += bestScore;
        suggestedSlots.push({
          ...slot,
          assignedPlayerId: bestPlayer.id,
          roleId: bestRole.id,
          customPIs: [],
        });
        if (bestScore >= 80 && keyPlayerNames.length < 4) {
          keyPlayerNames.push(bestPlayer.name);
        }
      } else {
        suggestedSlots.push({
          ...slot,
          customPIs: [],
        });
      }
    }

    const avgScore = Math.round(totalScore / template.slots.length);
    let matchScore = avgScore;

    // Reasoning Berbasis Analisis Struktur Skuad Nyata
    if (template.id === 'asym_3241_box') {
      if (isRightDefensive && isLeftAttacking) {
        matchScore += 10;
        reasoningList.push({
          title: 'Asimetri Sayap Sempurna (IFB Kanan + WB Kiri)',
          description: `${bestDR?.name} (Tackling ${bestDR?.attributes.tackling}, Heading ${bestDR?.attributes.heading}) sangat cocok sebagai Inverted Full-Back yang bergeser ke tengah menjadi bek ketiga. Sementara ${bestDL?.name} (Pace ${bestDL?.attributes.pace}, Crossing ${bestDL?.attributes.crossing}) leluasa melakukan overlap agresif di koridor kiri.`,
          type: 'flank',
        });
      }

      if (hasAnchorDM && hasEliteNo10) {
        reasoningList.push({
          title: 'Poros Box Midfield 3-2 Kokoh',
          description: `${bestDM?.name} (Tackling ${bestDM?.attributes.tackling}, Stamina ${bestDM?.attributes.stamina}) bertindak sebagai jangkar perisai sentral, membebaskan ${bestAMC?.name} (Vision ${bestAMC?.attributes.vision}, Passing ${bestAMC?.attributes.passing}) beroperasi di kantong ruang nomor 10.`,
          type: 'midfield',
        });
      }

      reasoningList.push({
        title: 'Rest Defence 3-2 Terjamin',
        description: 'Saat fase menyerang, tim bertransformasi menjadi 3-2-4-1 (3 bek tengah sejajar + 2 pivot DM) yang mematikan jalur serangan balik lawan.',
        type: 'defence',
      });

      reasoningList.push({
        title: 'Manajemen Risiko Sayap Kiri',
        description: `Karena ${bestDL?.name} sering overlap tinggi, pastikan gelandang sentral kiri siap meng-cover ruang kosong jika lawan melancarkan umpan diagonal kilat.`,
        type: 'risk',
      });
    } else if (template.id === '433_dm_wide') {
      if (dmPlayers.length >= 2 && amrPlayers.length >= 2 && amlPlayers.length >= 2) {
        matchScore += 8;
        reasoningList.push({
          title: 'Kedalaman Sayap & Triangel Sentral Gegenpress',
          description: `Ketersediaan winger eksplosif seperti ${bestAMR?.name} (Dribbling ${bestAMR?.attributes.dribbling}) dan ${bestAML?.name} memberikan penetrasi lebar dan tusukan diagonal seimbang ke kotak penalti.`,
          type: 'attack',
        });
      }

      if (bestDM) {
        reasoningList.push({
          title: 'Single Pivot Anchor Stabil',
          description: `${bestDM.name} menjadi jembatan pengalir bola dari belakang sekaligus pemutus serangan di depan 2 bek tengah.`,
          type: 'midfield',
        });
      }

      reasoningList.push({
        title: 'Pertahanan 4 Bek Zonal Seimbang',
        description: 'Bentuk 4-3-3 memberikan perlindungan zonal 4 bek yang sangat rapat dan transisi serangan balik cepat.',
        type: 'defence',
      });
    } else if (template.id === '4231_dm_wide') {
      if (hasEliteNo10 && dmPlayers.length >= 2) {
        matchScore += 7;
        reasoningList.push({
          title: 'Perlindungan Double Pivot untuk Nomor 10',
          description: `Dua gelandang bertahan (Double Pivot) memberikan garansi pertahanan mutlak, membebaskan ${bestAMC?.name} (Vision ${bestAMC?.attributes.vision}) untuk fokus berkreasi mencetak assist dan gol.`,
          type: 'midfield',
        });
      }

      reasoningList.push({
        title: 'Tekanan Blok Tinggi Terpadu',
        description: 'Garis serang 4 pemain di sepertiga akhir lawan memudahkan skema pressing tinggi (High Block Pressing).',
        type: 'attack',
      });
    } else if (template.id === '532_wb' || template.id === '3421_box') {
      if (cbPlayers.length >= 4) {
        matchScore += 9;
        reasoningList.push({
          title: 'Kelimpahan Bek Tengah Berkualitas',
          description: `Skuad Anda memiliki ${cbPlayers.length} bek tengah kelas utama (seperti ${cbPlayers.slice(0, 2).map(c => c.name).join(', ')}), sangat ideal untuk skema 3 atau 5 bek yang mendominasi kotak penalti.`,
          type: 'defence',
        });
      }
      reasoningList.push({
        title: 'Ancaman Wing-Back Lebar',
        description: 'Kedua wing-back menjadi motor serangan utama yang menyuplai umpan silang ke dua penyerang.',
        type: 'flank',
      });
    } else if (template.id === '442_diamond') {
      if (amrPlayers.length <= 1 && amlPlayers.length <= 1) {
        matchScore += 8;
        reasoningList.push({
          title: 'Solusi Ketiadaan Winger Murni (Central Overload)',
          description: 'Skuad minim pemain sayap alami. Formasi 4-4-2 Diamond memadati koridor tengah dengan 4 gelandang cerdas yang mendikte penguasaan bola.',
          type: 'midfield',
        });
      }
    } else if (template.id === '442_flat') {
      if (stPlayers.length >= 2) {
        matchScore += 6;
        reasoningList.push({
          title: 'Kemitraan Duet Striker Komplementer',
          description: `Kombinasi 2 penyerang (seperti ${stPlayers.slice(0, 2).map(s => s.name).join(' & ')}) memungkinkan pembagian tugas kreator dan pencetak gol murni.`,
          type: 'attack',
        });
      }
    }

    if (reasoningList.length === 0) {
      reasoningList.push({
        title: 'Kecocokan Starting XI Tinggi',
        description: `Kecocokan atribut rata-rata pemain Starting XI mencapai ${avgScore}%, menjamin fluiditas taktik di atas lapangan.`,
        type: 'attack',
      });
    }

    recommendations.push({
      template,
      matchScore: Math.min(100, Math.max(10, matchScore)),
      reasoning: reasoningList,
      suggestedSlots,
      isAsymmetric: template.category === 'asymmetric',
      squadSummary: {
        startingXIScore: avgScore,
        flankBalance: isRightDefensive && isLeftAttacking ? 'Asimetris (Kiri Ofensif, Kanan Defensif)' : 'Simetris Seimbang',
        restDefenceStructure: template.category === 'asymmetric' ? '3-2 (Kokoh)' : '2+1 (Standar)',
        keyPlayers: keyPlayerNames,
      },
    });
  }

  // Urutkan dari skor tertinggi
  return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
}
