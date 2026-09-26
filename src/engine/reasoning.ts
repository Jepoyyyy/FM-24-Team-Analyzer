import { TacticSlot, Player, TeamInstructions, TacticalIssue, Position, Duty } from '../types';
import { getRoleById } from './roles';
import { detectFormationShape } from './formations';
import { calculateTacticalHealth } from './validator';
import { MENTALITY_KNOWLEDGE, DEFENSIVE_BLOCK_KNOWLEDGE, SET_PIECE_KNOWLEDGE } from '../data/guidetofootballKnowledge';

export interface PlayerTacticalImpact {
  slotId: string;
  playerId?: string;
  playerName: string;
  position: Position;
  roleId: string;
  roleName: string;
  duty: Duty;
  tacticalRole: string;
  impactSummary: string;
  demands: string[];
  instructionsImpact: string;
  synergyStatus: 'excellent' | 'good' | 'strained' | 'critical';
  synergyNote?: string;
}

export interface LiveFormationEvaluation {
  formationName: string;
  formationCode: string;
  structure: string;
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  verdict: string;
  reasoning: {
    category: 'flank' | 'midfield' | 'attack' | 'defence' | 'transition';
    title: string;
    description: string;
    icon: string;
  }[];
  strengths: string[];
  weaknesses: string[];
  playerImpacts: PlayerTacticalImpact[];
}

export function evaluateFormationReasoningAndImpact(
  slots: TacticSlot[],
  teamInstructions: TeamInstructions,
  playersMap: Map<string, Player>,
  tacticalIssues: TacticalIssue[]
): LiveFormationEvaluation {
  const detected = detectFormationShape(slots);
  const health = calculateTacticalHealth(slots, tacticalIssues);
  const mentalityInfo = MENTALITY_KNOWLEDGE[teamInstructions.mentality] || MENTALITY_KNOWLEDGE.positive;
  const blockInfo = DEFENSIVE_BLOCK_KNOWLEDGE[teamInstructions.lineOfEngagement] || DEFENSIVE_BLOCK_KNOWLEDGE.high_press;

  const getPlayer = (slot: TacticSlot) => slot.assignedPlayerId ? playersMap.get(slot.assignedPlayerId) : undefined;
  const getRole = (slot: TacticSlot) => getRoleById(slot.roleId);

  // Grade calculation
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (!health.isLayer1Valid) grade = 'F';
  else if (health.score >= 90) grade = 'S';
  else if (health.score >= 80) grade = 'A';
  else if (health.score >= 68) grade = 'B';
  else if (health.score >= 50) grade = 'C';
  else grade = 'D';

  // Flank slots
  const leftBack = slots.find(s => s.position === 'DL' || s.position === 'WBL');
  const rightBack = slots.find(s => s.position === 'DR' || s.position === 'WBR');
  const leftWing = slots.find(s => s.position === 'AML' || s.position === 'ML');
  const rightWing = slots.find(s => s.position === 'AMR' || s.position === 'MR');

  const lbRole = leftBack ? getRole(leftBack) : undefined;
  const rbRole = rightBack ? getRole(rightBack) : undefined;
  const lwRole = leftWing ? getRole(leftWing) : undefined;
  const rwRole = rightWing ? getRole(rightWing) : undefined;

  const lbPlayer = leftBack ? getPlayer(leftBack) : undefined;
  const rbPlayer = rightBack ? getPlayer(rightBack) : undefined;
  const lwPlayer = leftWing ? getPlayer(leftWing) : undefined;
  const rwPlayer = rightWing ? getRole(rightWing) : undefined;

  // Central defenders & holding DMs
  const cbs = slots.filter(s => s.position === 'DC');
  const dms = slots.filter(s => s.position === 'DM');
  const mcs = slots.filter(s => s.position === 'MC');
  const amcs = slots.filter(s => s.position === 'AMC');
  const strikers = slots.filter(s => s.position === 'STC');

  // =========================================================================
  // 1. DYNAMIC REASONING PILLARS (Mengapa Formasi & Instruksi Ini Bekerja)
  // =========================================================================
  const reasoningList: LiveFormationEvaluation['reasoning'] = [];

  // A. Flank Dynamics
  let flankTitle = 'Sinergi Flank & Koridor Tepi';
  let flankDesc = '';
  if (leftBack && rightBack && leftWing && rightWing) {
    const isAsym = (lbRole?.code !== rbRole?.code) || (leftBack.duty !== rightBack.duty);
    if (isAsym) {
      flankDesc = `Struktur flank bersifat asimetris: Sisi kiri mengandalkan ${lbRole?.name} (${leftBack.duty}) berpasangan dengan ${lwRole?.name} (${leftWing.duty}), sedangkan sisi kanan digalang oleh ${rbRole?.name} (${rightBack.duty}) bersama ${rwRole?.name} (${rightWing.duty}). `;
      if (leftBack.roleId === 'ifb' || rightBack.roleId === 'ifb') {
        flankDesc += 'Penerapan Inverted Full-Back (IFB) secara cerdas membentuk struktur 3-bek saat fase menyerang, memberi kebebasan flank seberang untuk overlap.';
      } else if (teamInstructions.overlapLeft || teamInstructions.overlapRight) {
        flankDesc += 'Instruksi Overlap memaksa bek sayap aktif naik menyusuri garis luar saat sayap memotong ke koridor dalam.';
      }
    } else {
      flankDesc = `Kedua sayap menerapkan pola simetris dengan ${leftBack.duty} di kiri dan ${rightBack.duty} di kanan. Mempertahankan lebar alami lapangan (${teamInstructions.attackingWidth}).`;
    }
  } else if (!leftBack && !rightBack && cbs.length === 3) {
    flankDesc = 'Formasi 3-bek murni tanpa fullback ortodoks. Lebar pertahanan dan transisi sepenuhnya dibebankan pada Wing-Back atau Wide Midfielder.';
  } else {
    flankDesc = `Bentuk sayap terdeteksi ${detected.flankAnalysis.left} di kiri dan ${detected.flankAnalysis.right} di kanan dengan lebar serangan ${teamInstructions.attackingWidth}.`;
  }
  reasoningList.push({
    category: 'flank',
    title: flankTitle,
    description: flankDesc,
    icon: 'ArrowLeftRight',
  });

  // B. Midfield Architecture & Mentality
  let midTitle = `Arsitektur Lini Tengah & Mentalitas (${mentalityInfo.name})`;
  let midDesc = `Filosofi Mentalitas: ${mentalityInfo.indonesianName} (${mentalityInfo.riskLevel}). ${mentalityInfo.philosophy} `;
  const hasAnchor = dms.some(s => s.roleId === 'anchor' || s.roleId === 'half_back' || (s.roleId === 'dm' && s.duty === 'Defend'));
  const hasPlaymaker = slots.some(s => ['dlp_dm', 'dlp_cm', 'regista', 'roaming_playmaker_dm', 'ap_cm', 'ap_amc'].includes(s.roleId));
  const hasRunner = slots.some(s => ['bbm', 'mezzala', 'segundo_volante'].includes(s.roleId) || (s.position === 'MC' && s.duty === 'Attack'));

  if (hasAnchor && hasPlaymaker && hasRunner) {
    midDesc += 'Segitiga lini tengah memenuhi prinsip ideal GuideToFootball: Jangkar penahan (Holding), pengatur tempo (Playmaker/Creator), dan pelari penembus kotak penalti (Runner). Sirkulasi bola sangat cair dan stabil saat transisi.';
  } else if (hasAnchor && hasPlaymaker) {
    midDesc += 'Lini tengah sangat kokoh dan unggul dalam ball possession, namun minim pelari penetrasi dari lini kedua. Beban mencetak gol dominan pada penyerang.';
  } else if (!hasAnchor && dms.length > 0) {
    midDesc += 'Pivot ganda lini tengah cenderung dinamis, namun berisiko meninggalkan ruang kosong di depan bek tengah jika kedua gelandang serempak maju.';
  } else if (mcs.length + dms.length + amcs.length >= 4) {
    midDesc += `Kepadatan lini tengah (${mcs.length + dms.length + amcs.length} pemain) memastikan dominasi overload di zona sentral dengan tempo ${teamInstructions.tempo} dan directness ${teamInstructions.passingDirectness}.`;
  } else {
    midDesc += 'Lini tengah bertumpu pada transisi cepat dengan passing langsung, menghindari duel berlama-lama di zona sentral.';
  }
  reasoningList.push({
    category: 'midfield',
    title: midTitle,
    description: midDesc,
    icon: 'Layers',
  });

  // C. Attacking Structure & Final Third
  let attTitle = 'Pola Penetrasi & Eksekusi Kotak Penalti';
  let attDesc = '';
  if (strikers.length === 1) {
    const stRole = getRole(strikers[0]);
    attDesc = `Ujung tombak tunggal (${stRole?.name} - ${strikers[0].duty}) bertindak sebagai titik fokus sepertiga akhir. `;
    if (teamInstructions.workBallIntoBox) {
      attDesc += 'Instruksi Work Ball Into Box menuntut kesabaran sirkulasi pendek hingga peluang bersih di depan gawang tercipta.';
    } else {
      attDesc += 'Tim bermain agresif mengeksekusi peluang tembakan lebih langsung.';
    }
  } else if (strikers.length === 2) {
    attDesc = 'Kombinasi dual striker mengancam dua bek tengah lawan secara simultan, memaksa pertahanan lawan tidak bisa leluasa melakukan cover.';
  } else if (strikers.length === 0) {
    attDesc = 'Sistem Strikerless (0 STC): Membingungkan bek tengah lawan yang kehilangan target man untuk dijaga, memanfaatkan celah tarik bek ke depan.';
  } else {
    attDesc = `Lini serang agresif dengan ${strikers.length} penyerang tengah memadati kotak penalti lawan.`;
  }

  if (teamInstructions.playForSetPieces) {
    attDesc += ' [Play for Set Pieces Aktif]: Pemain diinstruksikan mengeksploitasi bola mati (corner/free-kick) sebagai senjata utama membongkar pertahanan lawan (GuideToFootball Set Piece Strategy).';
  }

  reasoningList.push({
    category: 'attack',
    title: attTitle,
    description: attDesc,
    icon: 'Zap',
  });

  // D. Defensive Foundation & Line of Engagement (GuideToFootball)
  let defTitle = `Fondasi Pertahanan: ${blockInfo.indonesianName}`;
  let defDesc = `Rest Defence terdeteksi ${detected.restDefenceCount} pemain di belakang bola (${detected.restDefenceRating.toUpperCase()}). `;
  if (detected.restDefenceCount >= 4) {
    defDesc += 'Pertahanan sangat solid (Solid 4-Pilar), mengunci semua jalur counter-attack lawan saat tim sedang membombardir pertahanan mereka.';
  } else if (detected.restDefenceCount === 3) {
    defDesc += 'Struktur rest defence standar (3-Bek di belakang bola, misal 3-2 rest defence) yang stabil menjaga kedalaman.';
  } else {
    defDesc += 'PERINGATAN: Hanya ada 1-2 pemain di belakang garis bola saat fase menyerang. Tim sangat rapuh dibobol lewat serangan balik cepat (counter-attack).';
  }
  defDesc += ` Blok Pertahanan: ${blockInfo.name} (Zona: ${blockInfo.pitchZone}). Garis pertahanan: ${teamInstructions.defensiveLine}, Pressing: ${teamInstructions.pressingIntensity}.`;
  reasoningList.push({
    category: 'defence',
    title: defTitle,
    description: defDesc,
    icon: 'ShieldCheck',
  });

  // E. Tactical Risk Watchpoint
  let riskTitle = 'Titik Rawan & Antisipasi Taktis Lawan';
  let riskDesc = '';
  if (tacticalIssues.length > 0) {
    const topIssue = tacticalIssues[0];
    riskDesc = `Perhatikan ${topIssue.title}: ${topIssue.description} Solusi yang disarankan: ${topIssue.suggestedFix}`;
  } else {
    riskDesc = 'Taktik memiliki harmoni ruang dan duty yang sangat baik. Waspadai lawan yang bermain direct counter-attack jika tim menggunakan garis pertahanan tinggi (Higher Defensive Line).';
  }
  reasoningList.push({
    category: 'transition',
    title: riskTitle,
    description: riskDesc,
    icon: 'AlertTriangle',
  });

  // =========================================================================
  // 2. KELEBIHAN & KELEMAHAN TAKTIS (STRENGTHS & WEAKNESSES)
  // =========================================================================
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (detected.dutyDistribution.status === 'balanced') {
    strengths.push(`Keseimbangan Duty Sangat Ideal (${detected.dutyDistribution.defend} Defend, ${detected.dutyDistribution.support} Support, ${detected.dutyDistribution.attack} Attack).`);
  } else if (detected.dutyDistribution.status === 'over_attacking') {
    weaknesses.push(`Terlalu Over-Attacking (${detected.dutyDistribution.attack} pemain Attack), rawan dieksploitasi serangan balik.`);
  } else if (detected.dutyDistribution.status === 'too_defensive') {
    weaknesses.push(`Terlalu Defensif (${detected.dutyDistribution.defend} pemain Defend), minim daya dobrak di sepertiga akhir.`);
  }

  if (detected.restDefenceRating === 'solid' || detected.restDefenceRating === 'stable') {
    strengths.push(`Rest Defence Kokoh (${detected.restDefenceCount} pemain mengamankan bola saat menyerang).`);
  } else {
    weaknesses.push(`Rest Defence Rentan (${detected.restDefenceCount} pemain), bahaya saat transisi negatif.`);
  }

  if (teamInstructions.playOutOfDefence && teamInstructions.passingDirectness === 'shorter') {
    strengths.push('Struktur Build-up dari Bawah (Play Out of Defence) solid dengan passing pendek.');
  }

  if (teamInstructions.whenLostPossession === 'counter_press') {
    strengths.push('Gegenpress Aktif: Reaksi segera merebut bola detik-detik awal setelah kehilangan penguasaan.');
  }

  if (teamInstructions.preventShortGkDistribution) {
    strengths.push('Mengunci distribusi kiper lawan sejak di kotak penalti.');
  }

  tacticalIssues.forEach(issue => {
    if (issue.severity === 'danger' && weaknesses.length < 5) {
      weaknesses.push(`${issue.title}: ${issue.suggestedFix}`);
    }
  });

  // Fallback defaults if empty
  if (strengths.length < 3) {
    strengths.push(`Struktur formasi ${detected.name} terorganisir dengan ${detected.structure}.`);
    strengths.push('Fleksibilitas rotasi posisi saat fase penguasaan bola.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Konsentrasi dan stamina pemain terkuras jika menerapkan intensitas pressing tinggi sepanjang 90 menit.');
  }

  // =========================================================================
  // 3. DAMPAK TAKTIS KE MASING-MASING PEMAIN (PER-PLAYER TACTICAL IMPACT)
  // =========================================================================
  const playerImpacts: PlayerTacticalImpact[] = slots.map(slot => {
    const player = getPlayer(slot);
    const role = getRole(slot);
    const playerName = player ? player.name : `Pemain (${slot.position})`;
    const roleName = role ? role.name : slot.roleId.toUpperCase();

    let tacticalRole = 'Pilar Taktis';
    let impactSummary = '';
    const demands: string[] = role?.keyAttributes?.slice(0, 3) || ['Positioning', 'Decisions', 'Work Rate'];
    let instructionsImpact = '';
    let synergyStatus: 'excellent' | 'good' | 'strained' | 'critical' = 'good';
    let synergyNote: string | undefined = undefined;

    // Cek apakah slot ini terkena issue
    const relatedIssue = tacticalIssues.find(i => i.affectedPositions?.includes(slot.position));
    if (relatedIssue) {
      if (relatedIssue.severity === 'danger') {
        synergyStatus = 'critical';
        synergyNote = relatedIssue.title;
      } else {
        synergyStatus = 'strained';
        synergyNote = relatedIssue.title;
      }
    } else {
      synergyStatus = 'excellent';
    }

    // Role specific evaluation
    if (slot.position === 'GK') {
      tacticalRole = 'Penjaga Gawang Terakhir';
      impactSummary = role?.code === 'SK'
        ? `${playerName} bertindak sebagai sweeper aktif di luar kotak penalti, mengantisipasi bola lambung di belakang garis pertahanan ${teamInstructions.defensiveLine}.`
        : `${playerName} fokus menjaga gawang dan garis mistar penalti secara konservatif.`;
      instructionsImpact = `Mendapat instruksi distribusi bola ${teamInstructions.gkDistributionType} dengan tempo ${teamInstructions.gkDistributionPace}.`;
    } else if (slot.position === 'DC') {
      tacticalRole = role?.code === 'BPD' ? 'Ball-Playing Playmaker dari Belakang' : 'Palang Pintu Sentral';
      impactSummary = role?.code === 'BPD'
        ? `${playerName} diwajibkan berani mengambil risiko operan vertikal membelah garis tengah lawan.`
        : `${playerName} bertugas memenangi duel fisik dan mengamankan kotak penalti dari bola silang lawan.`;
      instructionsImpact = teamInstructions.playOutOfDefence
        ? 'Terikat instruksi Play Out of Defence: Dilarang membuang bola panik, harus mencari operan pendek ke pivot/fullback.'
        : 'Bebas menyapu bola keluar saat berada dalam tekanan intensif lawan.';
    } else if (slot.position === 'DR' || slot.position === 'DL' || slot.position === 'WBR' || slot.position === 'WBL') {
      tacticalRole = role?.code === 'IFB'
        ? 'Inverted Full-Back (Bek Tengah Ketiga saat Build-up)'
        : role?.code === 'IWB'
        ? 'Inverted Wing-Back (Gelandang Poros Tambahan)'
        : 'Pelebar Serangan Sayap (Overlapping Flank Outlet)';
      impactSummary = role?.code === 'IFB'
        ? `${playerName} menyempit menjadi bek ketiga, memperkokoh Rest Defence tim menjadi ${detected.restDefenceCount} pemain.`
        : `${playerName} bertugas menyisir garis tepi, memberi opsi umpan silang (${teamInstructions.crossType}) ke kotak penalti.`;
      instructionsImpact = teamInstructions.overlapLeft || teamInstructions.overlapRight
        ? 'Mendapat beban stamina tinggi karena dituntut terus naik-turun menopang winger.'
        : 'Menjaga keseimbangan posisi pertahanan sayap.';
    } else if (slot.position === 'DM') {
      tacticalRole = role?.code === 'anchor' || role?.code === 'half_back'
        ? 'Perisai Pertahanan (Holding Shield)'
        : role?.code === 'segundo_volante'
        ? 'Segundo Volante (Gelandang Penyerang Kotak Penalti)'
        : 'Deep Lying Playmaker (Dirigen Lini Tengah)';
      impactSummary = `${playerName} menjadi penghubung krusial antara bek dan lini serang dengan duty ${slot.duty}.`;
      instructionsImpact = `Dipengaruhi tempo tim (${teamInstructions.tempo}) dan passing ${teamInstructions.passingDirectness}.`;
    } else if (slot.position === 'MC') {
      tacticalRole = role?.code === 'mezzala'
        ? 'Mezzala (Penusuk Half-Space)'
        : role?.code === 'bbm'
        ? 'Box-to-Box Engine (Mesin Dua Kotak Penalti)'
        : 'Gelandang Sentral Pengontrol Sirkulasi';
      impactSummary = `${playerName} menempati zona sentral untuk merebut bola kedua dan mendistribusikan bola.`;
      instructionsImpact = teamInstructions.workBallIntoBox
        ? 'Dituntut menahan diri dari tembakan spekulatif, memprioritaskan cut-back atau thru-pass.'
        : 'Bebas mencari sudut tembakan saat ada ruang tembak terbuka.';
    } else if (slot.position === 'AMC') {
      tacticalRole = role?.code === 'shadow_striker'
        ? 'Shadow Striker (Pencetak Gol dari Lini Kedua)'
        : 'Trequartista / Playmaker Nomor 10';
      impactSummary = `${playerName} beroperasi di kantong ruang antara gelandang dan bek lawan.`;
      instructionsImpact = teamInstructions.passIntoSpace
        ? 'Mendapat instruksi mengirim umpan terobosan tajam ke jalur lari penyerang.'
        : 'Melakukan kombinasi umpan pendek di sepertiga akhir.';
    } else if (slot.position === 'AMR' || slot.position === 'AML') {
      tacticalRole = role?.code === 'IF' || role?.code === 'IW'
        ? 'Penyerang Sayap Pemotong ke Dalam (Inside Finisher)'
        : 'Winger Murni Pelebar Lapangan';
      impactSummary = role?.code === 'IF' || role?.code === 'IW'
        ? `${playerName} bergerak diagonal menusuk ke kotak penalti untuk menembak atau memberi cut-back.`
        : `${playerName} mempertahankan lebar lapangan dan melepaskan crossing ${teamInstructions.crossType}.`;
      instructionsImpact = `Beroperasi dalam lebar serangan ${teamInstructions.attackingWidth}.`;
    } else if (slot.position === 'STC') {
      tacticalRole = role?.code === 'af'
        ? 'Advanced Forward (Ujung Tombak Penerobos Offside)'
        : role?.code === 'dlf' || role?.code === 'f9'
        ? 'False Nine / Link-up Striker'
        : 'Finisher Utama Kotak Penalti';
      impactSummary = `${playerName} menjadi muara akhir penyelesaian gol tim.`;
      instructionsImpact = teamInstructions.workBallIntoBox
        ? 'Menunggu servis bola matang di kotak penalti daripada turun terlalu jauh.'
        : 'Siap mengejar umpan terobosan cepat dari lini tengah.';
    }

    return {
      slotId: slot.slotId,
      playerId: slot.assignedPlayerId,
      playerName,
      position: slot.position,
      roleId: slot.roleId,
      roleName,
      duty: slot.duty,
      tacticalRole,
      impactSummary,
      demands,
      instructionsImpact,
      synergyStatus,
      synergyNote,
    };
  });

  const verdict = `${detected.name} berfilosofi "${mentalityInfo.name}" (${mentalityInfo.indonesianName}) dengan tempo ${teamInstructions.tempo} dan passing ${teamInstructions.passingDirectness}. Memiliki nilai kelayakan taktik ${health.score}% (${grade}) serta ${detected.restDefenceCount} pilar rest defence dalam skema ${blockInfo.name}.`;

  return {
    formationName: detected.name,
    formationCode: detected.code,
    structure: detected.structure,
    overallScore: health.score,
    grade,
    verdict,
    reasoning: reasoningList,
    strengths,
    weaknesses,
    playerImpacts,
  };
}
