import { TacticSlot, TacticalIssue, TeamInstructions, Player } from '../types';
import { getRoleById } from './roles';

export function auditTactics(
  slots: TacticSlot[],
  teamInstructions: TeamInstructions,
  playersMap: Map<string, Player>
): TacticalIssue[] {
  const issues: TacticalIssue[] = [];

  const getSlotRole = (slot: TacticSlot) => getRoleById(slot.roleId);
  const getAssignedPlayer = (slot: TacticSlot) => slot.assignedPlayerId ? playersMap.get(slot.assignedPlayerId) : undefined;

  // ========================================================
  // 0. LAYER 1: POSISI INTI WAJIB & INTEGRITAS STRUKTUR TAKTIK
  // ========================================================
  const gkSlots = slots.filter(s => s.position === 'GK');
  const defSlots = slots.filter(s => ['DC', 'DL', 'DR', 'WBL', 'WBR'].includes(s.position));
  const cbSlots = slots.filter(s => s.position === 'DC');
  // Midfield mencakup Defensive Midfield (DM), Central/Wide Midfield (MC/ML/MR), dan Attacking Midfield (AMC/AML/AMR)
  const midSlots = slots.filter(s => ['DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR'].includes(s.position));
  // Attacker adalah ujung tombak / penyerang tengah (STC)
  const strikerSlots = slots.filter(s => s.position === 'STC');

  // A. Penjaga Gawang (Goalkeeper / GK)
  if (gkSlots.length === 0) {
    issues.push({
      id: 'layer1_missing_gk',
      title: 'Ketiadaan Penjaga Gawang (0 GK) - Pelanggaran Fatal',
      description: 'Formasi tidak memiliki penjaga gawang di bawah mistar gawang. Dalam sepak bola resmi dan FM24, tim tidak dapat bertanding tanpa kiper karena setiap tembakan lawan akan langsung berbuah gol ke gawang kosong.',
      severity: 'danger',
      category: 'structure_integrity',
      suggestedFix: 'Tugaskan tepat 1 pemain di posisi GK (Sweeper Keeper atau Goalkeeper).',
    });
  } else if (gkSlots.length > 1) {
    issues.push({
      id: 'layer1_multiple_gk',
      title: `Lebih dari Satu Penjaga Gawang (${gkSlots.length} GK)`,
      description: `Terdapat ${gkSlots.length} kiper di lapangan. Regulasi sepak bola hanya memperbolehkan tepat 1 kiper aktif bermain di lapangan.`,
      severity: 'danger',
      category: 'structure_integrity',
      affectedPositions: gkSlots.map(s => s.position),
      suggestedFix: 'Kurangi slot kiper menjadi tepat 1 pemain GK.',
    });
  }

  // B. Lini Belakang (Defenders: DC / DL / DR / WB)
  if (defSlots.length === 0) {
    issues.push({
      id: 'layer1_missing_defenders',
      title: 'Ketiadaan Lini Pertahanan (0 Bek) - Bencana Taktis',
      description: 'Formasi tidak memiliki pemain bertahan sama sekali (0 Bek). Lini pertahanan terbuka lebar, memudahkan penyerang lawan berhadapan satu lawan satu dengan kiper.',
      severity: 'danger',
      category: 'structure_integrity',
      suggestedFix: 'Tempatkan minimal 3 hingga 5 bek di lini belakang (kombinasi DC, DL, DR, atau WB).',
    });
  } else if (defSlots.length < 3) {
    issues.push({
      id: 'layer1_insufficient_defenders',
      title: `Lini Pertahanan Kurang Memadai (Hanya ${defSlots.length} Bek)`,
      description: `Hanya ada ${defSlots.length} bek di lini belakang. Standar taktik sepak bola memerlukan minimal 3 bek (struktur 3 bek, 4 bek, atau 5 bek) untuk mengamankan lebar kotak penalti.`,
      severity: 'danger',
      category: 'structure_integrity',
      affectedPositions: defSlots.map(s => s.position),
      suggestedFix: 'Tambahkan pemain bertahan hingga mencapai minimal 3 atau 4 bek.',
    });
  } else if (defSlots.length > 5) {
    issues.push({
      id: 'layer1_excessive_defenders',
      title: `Penumpukan Lini Belakang Berlebihan (${defSlots.length} Bek)`,
      description: `Terdapat ${defSlots.length} bek di lini belakang. Tim akan terlalu pasif dan tertekan di wilayah sendiri karena minim pemain untuk mengalirkan bola keluar.`,
      severity: 'warning',
      category: 'structure_integrity',
      affectedPositions: defSlots.map(s => s.position),
      suggestedFix: 'Gunakan formasi standar dengan 3, 4, atau 5 bek.',
    });
  }

  // Cek Keberadaan Bek Tengah Murni (Central Defender)
  if (defSlots.length > 0 && cbSlots.length === 0) {
    issues.push({
      id: 'layer1_missing_cb',
      title: 'Ketiadaan Bek Tengah Murni (0 DC)',
      description: 'Terdapat bek sayap tetapi tidak ada satupun Bek Tengah (DC) di jantung pertahanan. Kotak 16 meter kosong dari penjaga duel udara dan antisipasi umpan silang sentral lawan.',
      severity: 'danger',
      category: 'structure_integrity',
      suggestedFix: 'Tempatkan minimal 2 Central Defender (DC) di jantung pertahanan.',
    });
  }

  // C. Lini Tengah (Midfielders: DM / MC / ML / MR / AMC / AML / AMR)
  if (midSlots.length === 0) {
    issues.push({
      id: 'layer1_missing_midfielders',
      title: 'Ketiadaan Lini Tengah (0 Gelandang) - Tim Terbelah Total',
      description: 'Formasi tidak memiliki satu pun gelandang bertahan, tengah, maupun serang (DM/MC/ML/MR/AMC/AML/AMR). Ruang mesin kosong dan tim terbelah dua (broken team).',
      severity: 'danger',
      category: 'structure_integrity',
      suggestedFix: 'Pasang minimal 2-6 gelandang untuk mengontrol tempo dan sirkulasi permainan.',
    });
  } else if (midSlots.length < 2) {
    issues.push({
      id: 'layer1_isolated_midfielder',
      title: `Lini Tengah Terisolasi (Hanya ${midSlots.length} Gelandang)`,
      description: 'Jumlah gelandang terlalu sedikit untuk menopang pertahanan dan mendistribusikan bola. Lawan akan sangat mudah mengeroyok (overload) lini tengah.',
      severity: 'danger',
      category: 'structure_integrity',
      affectedPositions: midSlots.map(s => s.position),
      suggestedFix: 'Pasang rekan pendamping di lini tengah (minimal 2 hingga 6 gelandang).',
    });
  } else if (midSlots.length > 7) {
    issues.push({
      id: 'layer1_excessive_midfielders',
      title: `Lini Tengah Terlalu Padat (${midSlots.length} Gelandang)`,
      description: `Terdapat ${midSlots.length} gelandang di lapangan. Terlalu banyak pemain memperebutkan ruang sirkulasi yang sama.`,
      severity: 'warning',
      category: 'structure_integrity',
      affectedPositions: midSlots.map(s => s.position),
      suggestedFix: 'Batasi jumlah gelandang maksimal 6-7 pemain.',
    });
  }

  // D. Lini Serang / Ujung Tombak (Attacker: STC)
  const hasBoxRunnerFromAM = slots.some(s =>
    ['AMC', 'AML', 'AMR'].includes(s.position) &&
    (['shadow_striker', 'inside_forward', 'inverted_winger'].includes(s.roleId) || s.duty === 'Attack')
  );

  if (strikerSlots.length === 0) {
    if (!hasBoxRunnerFromAM) {
      issues.push({
        id: 'layer1_missing_strikers',
        title: 'Ketiadaan Penyerang / Ujung Tombak (0 STC) - Minim Ancaman Gol',
        description: 'Taktik tidak memiliki penyerang tengah (0 STC) dan juga tidak memiliki gelandang serang (AMC/AML/AMR) yang agresif merangsek ke kotak penalti dengan tugas Attack.',
        severity: 'danger',
        category: 'structure_integrity',
        suggestedFix: 'Pasang minimal 1 Striker (STC) di lini depan atau berikan duty Attack pada Shadow Striker / Inside Forward.',
      });
    } else {
      issues.push({
        id: 'layer1_strikerless_system',
        title: 'Taktik Formasi Strikerless (0 STC)',
        description: 'Taktik bermain tanpa striker murni dan bertumpu pada pelari lini kedua dari Attacking Midfield (AMC/AML/AMR). Pastikan rotasi ruang dan timing umpan terobosan berjalan lancar.',
        severity: 'info',
        category: 'structure_integrity',
        suggestedFix: 'Pastikan gelandang serang memiliki atribut Off the Ball, Composure, dan Finishing tinggi.',
      });
    }
  } else if (strikerSlots.length > 3) {
    issues.push({
      id: 'layer1_too_many_strikers',
      title: `Penumpukan Penyerang Tengah Berlebihan (${strikerSlots.length} STC)`,
      description: `Ada ${strikerSlots.length} striker di kotak penalti. Pemain saling menghambat ruang gerak dan menyebabkan tim kalah jumlah di lini tengah.`,
      severity: 'danger',
      category: 'structure_integrity',
      affectedPositions: strikerSlots.map(s => s.position),
      suggestedFix: 'Gunakan maksimal 1-2 striker tengah.',
    });
  }

  // E. Kelengkapan Skuad (11 Pemain Aktif)
  if (slots.length !== 11) {
    issues.push({
      id: 'layer1_slot_count_mismatch',
      title: `Jumlah Pemain Tidak Sesuai Standar (${slots.length} Pemain)`,
      description: `Formasi sepak bola resmi mewajibkan tepat 11 pemain di lapangan. Terdeteksi ${slots.length} pemain saat ini.`,
      severity: 'danger',
      category: 'structure_integrity',
      suggestedFix: 'Lengkapi atau sesuaikan formasi menjadi tepat 11 pemain.',
    });
  }

  // ========================================================
  // 1. TABRAKAN RUANG, KORIDOR & PARTNERSHIP (GUIDETOFOOTBALL)
  // ========================================================

  // A. Flank / Touchline: Right Side
  const rightBack = slots.find(s => s.position === 'DR' || s.position === 'WBR');
  const rightWing = slots.find(s => s.position === 'AMR' || s.position === 'MR');
  const leftBack = slots.find(s => s.position === 'DL' || s.position === 'WBL');
  const leftWing = slots.find(s => s.position === 'AML' || s.position === 'ML');

  if (rightBack && rightWing) {
    const rbRole = getSlotRole(rightBack);
    const rwRole = getSlotRole(rightWing);
    if ((rbRole?.code === 'WB' || rbRole?.code === 'CWB') && rightBack.duty === 'Attack' && rwRole?.code === 'W' && rightWing.duty === 'Attack') {
      issues.push({
        id: 'clash_touchline_right',
        title: 'Redundansi Garis Tepi Kanan (Touchline Clash)',
        description: 'Wing-Back (Attack) dan Winger (Attack) di sisi kanan memperebutkan jalur lari terluar yang sama secara bersamaan. Koridor dalam (half-space) menjadi kosong.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [rightBack.position, rightWing.position],
        suggestedFix: 'Ubah Winger kanan menjadi Inverted Winger / Inside Forward, atau turunkan duty Wing-Back menjadi Support.',
      });
    }

    // GuideToFootball: Flank Width Deficiency (IF/IW + IFB)
    const isRightInside = rwRole?.code === 'IF' || rwRole?.code === 'IW';
    const isRightIFB = rbRole?.code === 'IFB';
    if (isRightInside && isRightIFB) {
      issues.push({
        id: 'clash_dead_width_right',
        title: 'Kehilangan Lebar Lapangan Sisi Kanan (Dead Flank Width)',
        description: 'Berdasarkan GuideToFootball, Inside Forward/Inverted Winger memotong ke koridor dalam, sementara Inverted Full-Back (IFB) masuk ke sentral menjadi bek tengah ketiga. Sisi kanan sama sekali tidak memiliki pemain yang menjaga lebar serangan (width), memudahkan lawan mempersempit pertahanan.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [rightBack.position, rightWing.position],
        suggestedFix: 'Ubah bek kanan menjadi Wing-Back (Support/Attack) untuk menyediakan overlapping run, atau geser gelandang kanan melebar.',
      });
    }

    // GuideToFootball: Dual Defend Flank (Sterile Wing)
    if (rightBack.duty === 'Defend' && rightWing.duty === 'Defend') {
      issues.push({
        id: 'clash_sterile_flank_right',
        title: 'Flank Kanan Terlalu Pasif (Sterile Wing)',
        description: 'Bek kanan dan sayap kanan keduanya bertugas Defend. Menurut GuideToFootball, flank ini tidak akan memberikan kontribusi progresi bola atau umpan silang ke kotak penalti.',
        severity: 'info',
        category: 'space_clash',
        affectedPositions: [rightBack.position, rightWing.position],
        suggestedFix: 'Tingkatkan salah satu peran di sisi kanan menjadi Support atau Attack untuk menghidupkan serangan flank.',
      });
    }
  }

  // Flank / Touchline: Left Side
  if (leftBack && leftWing) {
    const lbRole = getSlotRole(leftBack);
    const lwRole = getSlotRole(leftWing);
    if ((lbRole?.code === 'WB' || lbRole?.code === 'CWB') && leftBack.duty === 'Attack' && lwRole?.code === 'W' && leftWing.duty === 'Attack') {
      issues.push({
        id: 'clash_touchline_left',
        title: 'Redundansi Garis Tepi Kiri (Touchline Clash)',
        description: 'Wing-Back (Attack) dan Winger (Attack) di sisi kiri memperebutkan jalur lari terluar yang sama secara bersamaan. Keduanya saling menutup sudut operan.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [leftBack.position, leftWing.position],
        suggestedFix: 'Ubah Winger kiri menjadi Inverted Winger / Inside Forward, atau turunkan duty Wing-Back menjadi Support.',
      });
    }

    // GuideToFootball: Flank Width Deficiency (IF/IW + IFB)
    const isLeftInside = lwRole?.code === 'IF' || lwRole?.code === 'IW';
    const isLeftIFB = lbRole?.code === 'IFB';
    if (isLeftInside && isLeftIFB) {
      issues.push({
        id: 'clash_dead_width_left',
        title: 'Kehilangan Lebar Lapangan Sisi Kiri (Dead Flank Width)',
        description: 'Inside Forward/Inverted Winger memotong ke koridor dalam, sementara Inverted Full-Back (IFB) masuk ke sentral menjadi bek tengah ketiga. Flank kiri kehilangan daya penetrasi garis tepi sama sekali.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [leftBack.position, leftWing.position],
        suggestedFix: 'Ubah bek kiri menjadi Wing-Back (Support) untuk overlap alami di belakang Inside Forward.',
      });
    }

    // GuideToFootball: Dual Defend Flank (Sterile Wing)
    if (leftBack.duty === 'Defend' && leftWing.duty === 'Defend') {
      issues.push({
        id: 'clash_sterile_flank_left',
        title: 'Flank Kiri Terlalu Pasif (Sterile Wing)',
        description: 'Bek kiri dan sayap kiri sama-sama bertugas Defend, mematikan ancaman serangan di sisi kiri.',
        severity: 'info',
        category: 'space_clash',
        affectedPositions: [leftBack.position, leftWing.position],
        suggestedFix: 'Tingkatkan duty salah satu pemain sisi kiri menjadi Support atau Attack.',
      });
    }
  }

  // GuideToFootball: Central Defence Partnership Rules (CB Pairing)
  if (cbSlots.length === 2) {
    const cb1 = cbSlots[0];
    const cb2 = cbSlots[1];

    // Dual Stopper Conflict
    if (cb1.duty === 'Stopper' && cb2.duty === 'Stopper') {
      issues.push({
        id: 'cb_dual_stopper_clash',
        title: 'Konflik Kemitraan Bek Tengah: Dual Stopper (GuideToFootball)',
        description: 'Kedua bek tengah bertugas Stopper (agresif maju menutup ruang). Menurut GuideToFootball, jika kedua bek tengah serempak keluar dari garis pertahanan, lawan dengan mudah mengeksploitasi ruang kosong raksasa di belakang mereka.',
        severity: 'danger',
        category: 'duty_balance',
        affectedPositions: [cb1.position, cb2.position],
        suggestedFix: 'Gunakan kombinasi klasik Stopper + Cover, atau Defend + Defend.',
      });
    }

    // Dual Cover Conflict
    if (cb1.duty === 'Cover' && cb2.duty === 'Cover') {
      issues.push({
        id: 'cb_dual_cover_clash',
        title: 'Konflik Kemitraan Bek Tengah: Dual Cover (GuideToFootball)',
        description: 'Kedua bek tengah bertugas Cover (sama-sama mundur menjaga ruang). Tidak ada bek yang berani maju menutup penyerang lawan di depan kotak penalti, memberi lawan kebebasan menembak dari jarak jauh.',
        severity: 'danger',
        category: 'duty_balance',
        affectedPositions: [cb1.position, cb2.position],
        suggestedFix: 'Ubah salah satu bek tengah menjadi Stopper atau Defend.',
      });
    }

    // Dual NCB in Possession System
    if (cb1.roleId === 'ncb' && cb2.roleId === 'ncb' && (teamInstructions.playOutOfDefence || teamInstructions.passingDirectness === 'shorter')) {
      issues.push({
        id: 'cb_dual_ncb_possession_clash',
        title: 'Dual No-Nonsense CB Bertolak Belakang dengan Build-up Penguasaan Bola',
        description: 'Keduanya adalah No-Nonsense Centre-Back yang diprogram membuang bola jauh ke depan tanpa ambil risiko. Hal ini merusak filosofi Play Out of Defence & Shorter Passing.',
        severity: 'warning',
        category: 'instruction_conflict',
        affectedPositions: [cb1.position, cb2.position],
        suggestedFix: 'Ubah minimal satu bek tengah menjadi Ball Playing Defender (BPD) atau Central Defender (Defend).',
      });
    }
  }

  // GuideToFootball: Central Midfield Triangle Balance (Holding + Creator + Runner)
  const allCentralMid = slots.filter(s => s.position === 'MC' || s.position === 'DM');
  if (allCentralMid.length >= 3) {
    const hasHoldingMid = allCentralMid.some(s =>
      ['anchor', 'half_back', 'dm'].includes(s.roleId) && (s.duty === 'Defend' || s.roleId === 'anchor' || s.roleId === 'half_back')
      || (s.roleId === 'dlp_dm' && s.duty === 'Defend')
      || (s.roleId === 'cm' && s.duty === 'Defend')
    );

    const hasRunnerOrPenetrator = allCentralMid.some(s =>
      ['bbm', 'mezzala', 'segundo_volante'].includes(s.roleId)
      || (s.roleId === 'cm' && s.duty === 'Attack')
    );

    if (!hasHoldingMid) {
      issues.push({
        id: 'cm_triangle_no_holding',
        title: 'Segitiga Lini Tengah: Ketiadaan Jangkar Bertahan (GuideToFootball)',
        description: 'Prinsip GuideToFootball untuk trio gelandang mensyaratkan minimal 1 peran penahan/jangkar (Holding). Seluruh gelandang Anda bertugas menyerang atau menjelajah tanpa jangkar tetap di depan bek.',
        severity: 'danger',
        category: 'duty_balance',
        affectedPositions: allCentralMid.map(s => s.position),
        suggestedFix: 'Pasang minimal satu gelandang bertugas jangkar murni seperti Anchor, Half Back, atau DM/CM bertugas Defend.',
      });
    }

    if (!hasRunnerOrPenetrator && !slots.some(s => s.position === 'AMC' && s.duty === 'Attack')) {
      issues.push({
        id: 'cm_triangle_no_runner',
        title: 'Lini Tengah Statis: Minim Pelari Kotak Penalti (GuideToFootball)',
        description: 'Trio lini tengah tidak memiliki gelandang dinamis penembus (Runner/Penetrator seperti BBM, Mezzala, atau CM-Attack). Beban penetrasi kotak penalti sepenuhnya jatuh pada penyerang.',
        severity: 'info',
        category: 'duty_balance',
        suggestedFix: 'Ubah salah satu gelandang tengah menjadi Box-to-Box Midfielder (BBM) atau Mezzala.',
      });
    }
  }

  // B. Half-Space Clashes: Inside Forward / IW + Mezzala
  const centralMidfielders = slots.filter(s => s.position === 'MC');
  const mezzalas = centralMidfielders.filter(s => s.roleId === 'mezzala');

  for (const mez of mezzalas) {
    // Cek apakah ada winger IF/IW di posisi kiri atau kanan
    if (mez.x < 50 && leftWing) {
      const lwRole = getSlotRole(leftWing);
      if ((lwRole?.code === 'IF' || lwRole?.code === 'IW') && leftWing.duty === 'Attack' && mez.duty === 'Attack') {
        issues.push({
          id: 'clash_halfspace_left',
          title: 'Kepadatan Koridor Dalam Kiri (Half-Space Jam)',
          description: 'Inside Forward / Inverted Winger (Attack) dan Mezzala (Attack) di sisi kiri melakukan lari diagonal menyerbu half-space yang sama. Ruang menjadi sesak dan koridor terluar kosong.',
          severity: 'danger',
          category: 'space_clash',
          affectedPositions: [leftWing.position, mez.position],
          suggestedFix: 'Ganti Mezzala menjadi Central Midfielder (Support) / Box-to-Box, atau ganti sayap kiri menjadi Winger.',
        });
      }
    }
    if (mez.x > 50 && rightWing) {
      const rwRole = getSlotRole(rightWing);
      if ((rwRole?.code === 'IF' || rwRole?.code === 'IW') && rightWing.duty === 'Attack' && mez.duty === 'Attack') {
        issues.push({
          id: 'clash_halfspace_right',
          title: 'Kepadatan Koridor Dalam Kanan (Half-Space Jam)',
          description: 'Inside Forward / Inverted Winger (Attack) dan Mezzala (Attack) di sisi kanan memperebutkan zona half-space yang sama di sepertiga akhir.',
          severity: 'danger',
          category: 'space_clash',
          affectedPositions: [rightWing.position, mez.position],
          suggestedFix: 'Ganti Mezzala menjadi CM(S) / BBM, atau ubah sayap kanan menjadi Winger murni.',
        });
      }
    }
  }

  // C. Inverted Wing-Back + Mezzala clash
  if (leftBack && leftBack.roleId === 'iwb') {
    const leftMez = centralMidfielders.find(s => s.roleId === 'mezzala' && s.x < 50);
    if (leftMez) {
      issues.push({
        id: 'clash_iwb_mez_left',
        title: 'Tabrakan Rotasi Transisi Kiri (IWB + Mezzala)',
        description: 'Inverted Wing-Back masuk ke sentral sementara Mezzala bergerak melebar ke luar di ruang transisi yang sama.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [leftBack.position, leftMez.position],
        suggestedFix: 'Pasangkan IWB dengan gelandang sentral statis seperti CM(D) atau DLP(D).',
      });
    }
  }
  if (rightBack && rightBack.roleId === 'iwb') {
    const rightMez = centralMidfielders.find(s => s.roleId === 'mezzala' && s.x > 50);
    if (rightMez) {
      issues.push({
        id: 'clash_iwb_mez_right',
        title: 'Tabrakan Rotasi Transisi Kanan (IWB + Mezzala)',
        description: 'Inverted Wing-Back kanan masuk ke sentral sementara Mezzala kanan bergerak melebar di koridor yang sama.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [rightBack.position, rightMez.position],
        suggestedFix: 'Pasangkan IWB kanan dengan gelandang sentral statis seperti CM(D) atau DLP(D).',
      });
    }
  }

  // D. Playmaker Jam (Multiple Playmakers in Midfield)
  const playmakerRoles = ['dlp_dm', 'dlp_cm', 'regista', 'roaming_playmaker_dm', 'ap_cm', 'ap_amc', 'enganche'];
  const activePlaymakers = slots.filter(s => playmakerRoles.includes(s.roleId));
  if (activePlaymakers.length >= 3) {
    issues.push({
      id: 'clash_playmaker_overload',
      title: 'Playmaker Overcrowding (Magnet Bola Ganda)',
      description: `Ada ${activePlaymakers.length} Playmaker utama di lini tengah. Sirkulasi bola bingung karena terlalu banyak titik magnet bola yang menuntut tempo permainan.`,
      severity: 'danger',
      category: 'space_clash',
      affectedPositions: activePlaymakers.map(s => s.position),
      suggestedFix: 'Batasi maksimal 1 atau 2 Playmaker. Ubah yang lain menjadi Box-to-Box, Central Midfielder, atau Anchor.',
    });
  }

  // E. Double Segundo Volante / BBM Exodus
  const dmSlots = slots.filter(s => s.position === 'DM');
  const segundoVolantes = dmSlots.filter(s => s.roleId === 'segundo_volante' && s.duty === 'Attack');
  const bbmList = centralMidfielders.filter(s => s.roleId === 'bbm');
  if (segundoVolantes.length > 0 && bbmList.length > 0 && dmSlots.length <= 2) {
    const hasHoldingDM = dmSlots.some(s => s.roleId === 'anchor' || s.roleId === 'half_back' || (s.roleId === 'dm' && s.duty === 'Defend'));
    if (!hasHoldingDM) {
      issues.push({
        id: 'clash_pivot_exodus',
        title: 'Eksodus Double Pivot (Lubang Sentral)',
        description: 'Segundo Volante (Attack) dan Box-to-Box Midfielder serempak meninggalkan posisi pivot untuk merangsek ke kotak penalti lawan. Meninggalkan celah 30 meter di depan CB.',
        severity: 'danger',
        category: 'space_clash',
        affectedPositions: [...segundoVolantes.map(s => s.position), ...bbmList.map(s => s.position)],
        suggestedFix: 'Pastikan minimal ada satu DM jangkar statis bertugas Defend (Anchor, Half Back, atau DM-Defend).',
      });
    }
  }

  // F. Striker Clashes
  const strikers = slots.filter(s => s.position === 'STC');
  if (strikers.length === 2) {
    const s1Role = getSlotRole(strikers[0]);
    const s2Role = getSlotRole(strikers[1]);
    // AF + Poacher
    if ((s1Role?.code === 'AF' || s1Role?.code === 'P') && (s2Role?.code === 'AF' || s2Role?.code === 'P') && strikers[0].duty === 'Attack' && strikers[1].duty === 'Attack') {
      issues.push({
        id: 'clash_strikers_linkup',
        title: 'Pemutusan Link-Up Lini Depan (AF + Poacher)',
        description: 'Kedua striker sama-sama berdiri di garis offside menunggu umpan terobosan. Tidak ada penyerang yang turun menjemput bola, memutus koneksi dengan lini tengah.',
        severity: 'warning',
        category: 'space_clash',
        affectedPositions: [strikers[0].position, strikers[1].position],
        suggestedFix: 'Ubah salah satu striker menjadi Deep Lying Forward (Support), Target Forward (Support), atau False Nine.',
      });
    }
    // F9 + DLF (Empty Box Syndrome)
    if ((s1Role?.code === 'F9' || s1Role?.code === 'DLF') && (s2Role?.code === 'F9' || s2Role?.code === 'DLF') && strikers[0].duty === 'Support' && strikers[1].duty === 'Support') {
      const hasShadowStrikerOrInsideForward = slots.some(s => (s.roleId === 'shadow_striker' || s.roleId === 'inside_forward') && s.duty === 'Attack');
      if (!hasShadowStrikerOrInsideForward) {
        issues.push({
          id: 'clash_empty_box',
          title: 'Empty Box Syndrome (Kotak Penalti Kosong)',
          description: 'Kedua striker sama-sama turun ke lini tengah (drop deep) tanpa adanya penyerang sayap (IF-A) atau Shadow Striker yang menusuk. Kotak penalti lawan kosong melompong saat crossing.',
          severity: 'danger',
          category: 'space_clash',
          affectedPositions: [strikers[0].position, strikers[1].position],
          suggestedFix: 'Berikan salah satu striker tugas Attack (AF / CF / Poacher), atau pasang Shadow Striker di belakangnya.',
        });
      }
    }
  }

  // ========================================================
  // 2. KESEIMBANGAN DUTY & REST DEFENCE
  // ========================================================
  const outfieldSlots = slots.filter(s => s.position !== 'GK');
  const defendDuties = outfieldSlots.filter(s => s.duty === 'Defend' || s.duty === 'Stopper' || s.duty === 'Cover');
  const attackDuties = outfieldSlots.filter(s => s.duty === 'Attack');
  const supportDuties = outfieldSlots.filter(s => s.duty === 'Support' || s.duty === 'Automatic');

  // Over-Attacking
  if (attackDuties.length >= 5) {
    issues.push({
      id: 'duty_over_attack',
      title: 'Over-Attacking (Glass Cannon)',
      description: `Terdapat ${attackDuties.length} pemain dengan tugas Attack. Tim akan sangat rentan terhadap serangan balik cepat karena kekurangan jumlah pemain di belakang bola saat transisi.`,
      severity: 'danger',
      category: 'duty_balance',
      suggestedFix: 'Kurangi tugas Attack menjadi 3 atau 4. Berikan tugas Support pada salah satu penyerang sayap atau gelandang.',
    });
  }

  // Insufficient Defend Duties
  if (defendDuties.length < 3 && outfieldSlots.length >= 10) {
    issues.push({
      id: 'duty_insufficient_defend',
      title: 'Struktur Pertahanan Terlalu Tipis (Minim Tugas Bertahan)',
      description: `Hanya ada ${defendDuties.length} outfield player bertugas Defend/Cover/Stopper. Struktur pertahanan mudah terekspos saat transisi cepat lawan.`,
      severity: 'warning',
      category: 'duty_balance',
      suggestedFix: 'Pastikan minimal 3 outfield player (khususnya bek tengah atau gelandang bertahan) memiliki tugas Defend.',
    });
  }

  // Support Starvation
  if (supportDuties.length <= 1) {
    issues.push({
      id: 'duty_support_starvation',
      title: 'Support Starvation (Tim Terbelah Dua)',
      description: `Hanya ada ${supportDuties.length} pemain dengan tugas Support. Tim terbagi menjadi dua gerbong terpisah (bertahan dan menyerang) tanpa jembatan pengalir bola yang solid.`,
      severity: 'warning',
      category: 'duty_balance',
      suggestedFix: 'Tambahkan minimal 3-4 pemain bertugas Support untuk menjaga fluiditas dan koneksi antarlini.',
    });
  }

  // Sterile Possession
  const attackingPositions = slots.filter(s => ['STC', 'AMR', 'AML', 'AMC'].includes(s.position));
  const frontAttackersWithAttackDuty = attackingPositions.filter(s => s.duty === 'Attack');
  if (frontAttackersWithAttackDuty.length === 0 && attackingPositions.length > 0) {
    issues.push({
      id: 'duty_sterile_possession',
      title: 'Sterile Possession (Nol Penetrasi Kotak Penalti)',
      description: 'Tidak ada satupun penyerang atau gelandang serang yang memiliki tugas Attack. Penguasaan bola mungkin tinggi, namun tim akan tumpul dan minim peluang gol bersih.',
      severity: 'danger',
      category: 'duty_balance',
      suggestedFix: 'Berikan tugas Attack pada penyerang utama (Advanced Forward / Poacher) atau penyerang sayap (Inside Forward).',
    });
  }

  // Dual Attacking Fullback Rest Defence Guard
  const attackingBacks = slots.filter(s => (s.position === 'DR' || s.position === 'DL' || s.position === 'WBR' || s.position === 'WBL') && s.duty === 'Attack');
  if (attackingBacks.length >= 2) {
    const cbCount = slots.filter(s => s.position === 'DC').length;
    const hasHoldingDM = slots.some(s => s.position === 'DM' && (s.roleId === 'anchor' || s.roleId === 'half_back' || (s.roleId === 'dm' && s.duty === 'Defend')));
    const hasInvertedFullback = slots.some(s => s.roleId === 'ifb');

    if (cbCount <= 2 && !hasHoldingDM && !hasInvertedFullback) {
      issues.push({
        id: 'duty_rest_defence_fullbacks',
        title: 'Rest Defence Runtuh (Kedua Bek Sayap Menyerang)',
        description: 'Kedua bek sayap maju menyerang bersamaan tanpa adanya jangkar pertahanan (Anchor / Half Back / IFB) yang melindungi 2 bek tengah. Sangat rentan dibantai serangan balik sayap lawan.',
        severity: 'danger',
        category: 'duty_balance',
        suggestedFix: 'Ubah salah satu bek menjadi Inverted Full-Back (Defend), atau pasang minimal 1 DM dengan role Anchor / Half Back.',
      });
    }
  }

  // Libero Guard Rules
  const liberoSlot = slots.find(s => s.roleId === 'lib');
  if (liberoSlot) {
    const cbs = slots.filter(s => s.position === 'DC');
    if (cbs.length < 3) {
      issues.push({
        id: 'libero_cb_count',
        title: 'Libero Membutuhkan Skema 3 Bek Tengah',
        description: 'Libero melangkah maju ke lini tengah saat menguasai bola. Jika hanya ada 2 bek tengah, saat menyerang hanya tersisa 1 bek tengah sendirian di belakang!',
        severity: 'danger',
        category: 'duty_balance',
        affectedPositions: [liberoSlot.position],
        suggestedFix: 'Gunakan Libero dalam skema 3 bek tengah (misal 3-5-2 atau 5-2-3), atau ganti role Libero menjadi BPD / CD.',
      });
    } else {
      const otherCbs = cbs.filter(s => s.slotId !== liberoSlot.slotId);
      const invalidPartners = otherCbs.filter(s => s.duty !== 'Defend');
      if (invalidPartners.length > 0) {
        issues.push({
          id: 'libero_partner_risk',
          title: 'Pendamping Libero Wajib Bertugas Defend Murni',
          description: 'Saat Libero maju ke lini tengah, kedua bek tengah pendamping wajib menahan posisi (Defend). Jangan pasang pendamping bertugas Stopper, Cover, atau WCB-Attack.',
          severity: 'danger',
          category: 'duty_balance',
          suggestedFix: 'Ubah bek pendamping Libero menjadi Central Defender (Defend) atau NCB (Defend).',
        });
      }
    }
  }

  // Lone DM Vulnerability
  if (dmSlots.length === 1) {
    const loneDM = dmSlots[0];
    if (loneDM.roleId === 'regista' || loneDM.roleId === 'roaming_playmaker_dm' || loneDM.roleId === 'segundo_volante') {
      issues.push({
        id: 'lone_dm_vulnerability',
        title: 'Poros Tunggal Terlalu Liar (Lone Pivot Vulnerability)',
        description: `${getSlotRole(loneDM)?.name} memiliki instruksi berkelana (roam) meninggalkan posisinya. Sebagai satu-satunya gelandang bertahan, ia meninggalkan zona di depan 2 CB tanpa perlindungan.`,
        severity: 'danger',
        category: 'duty_balance',
        affectedPositions: [loneDM.position],
        suggestedFix: 'Sebagai DM tunggal, gunakan peran disiplin penahan posisi: Anchor, Defensive Midfielder (Defend), DLP (Defend), atau Half Back.',
      });
    }
  }

  // ========================================================
  // 3. KAPASITAS ATRIBUT PEMAIN VS ROLE (CAPACITY WARNINGS)
  // ========================================================
  for (const slot of slots) {
    const player = getAssignedPlayer(slot);
    if (!player) continue;

    const role = getSlotRole(slot);
    if (!role) continue;

    const attrs = player.attributes;

    // SK check on High Line
    if (role.code === 'SK' && (teamInstructions.defensiveLine === 'higher' || teamInstructions.defensiveLine === 'much_higher')) {
      const anticipation = attrs.anticipation ?? 10;
      const rushingOut = attrs.rushingOut ?? 10;
      const pace = attrs.pace ?? 10;
      if (anticipation < 11 || rushingOut < 11 || pace < 10) {
        issues.push({
          id: `capacity_sk_${player.id}`,
          title: `${player.name}: Kapasitas Sweeper Keeper di High Line Kurang`,
          description: `Kiper memiliki Anticipation (${anticipation}), Rushing Out (${rushingOut}), atau Pace (${pace}) rendah. Ia akan terlambat menyapu bola terobosan di belakang garis pertahanan tinggi.`,
          severity: 'warning',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Gunakan kiper dengan atribut fisik & antisipasi lebih tinggi, atau turunkan garis pertahanan.',
        });
      }
    }

    // High Line vs Slow CBs
    if (slot.position === 'DC' && (teamInstructions.defensiveLine === 'higher' || teamInstructions.defensiveLine === 'much_higher')) {
      const pace = attrs.pace ?? 10;
      const accel = attrs.acceleration ?? 10;
      if (pace + accel < 23) {
        issues.push({
          id: `capacity_cb_slow_${player.id}`,
          title: `${player.name}: Bek Tengah Terlalu Lambat untuk Garis Tinggi`,
          description: `Bek tengah memiliki Pace (${pace}) dan Akselerasi (${accel}) rendah (total < 23). Sangat rentan dihukum bola lambung/terobosan penyerang cepat lawan.`,
          severity: 'danger',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Turunkan garis pertahanan tim ke Standard atau pasang bek dengan recovery pace lebih tinggi.',
        });
      }
    }

    // Play Out of Defence vs Panic CB
    if (slot.position === 'DC' && teamInstructions.playOutOfDefence) {
      const composure = attrs.composure ?? 10;
      const passing = attrs.passing ?? 10;
      if (composure < 10 || passing < 10) {
        issues.push({
          id: `capacity_cb_panic_${player.id}`,
          title: `${player.name}: Rentan Blunder saat Play Out of Defence`,
          description: `Bek tengah memiliki Composure (${composure}) atau Passing (${passing}) di bawah 10. Mudah panik saat ditekan lawan di kotak penalti sendiri.`,
          severity: 'warning',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Ganti role bek menjadi Central Defender (Defend) biasa, atau matikan instruksi Play Out of Defence.',
        });
      }
    }

    // Ball Playing Defender Technical check
    if (role.id === 'bpd') {
      const vision = attrs.vision ?? 10;
      const passing = attrs.passing ?? 10;
      const composure = attrs.composure ?? 10;
      if (vision < 11 || passing < 11 || composure < 11) {
        issues.push({
          id: `capacity_bpd_${player.id}`,
          title: `${player.name}: Visi & Operan BPD Kurang Memadai`,
          description: `BPD memiliki instruksi bawaan melepaskan umpan terobosan berisiko. Dengan Passing (${passing}) dan Vision (${vision}), operan jauhnya sering dipotong lawan.`,
          severity: 'warning',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Lebih aman ubah perannya menjadi Central Defender (Defend).',
        });
      }
    }

    // Inverted Full-Back Aerial Check
    if (role.id === 'ifb') {
      const heading = attrs.heading ?? 10;
      const jumping = attrs.jumpingReach ?? 10;
      if (heading < 11 || jumping < 11) {
        issues.push({
          id: `capacity_ifb_${player.id}`,
          title: `${player.name}: Duel Udara IFB Rentan`,
          description: `Inverted Full-Back bertransformasi menjadi bek tengah ketiga saat menyerang. Dengan Heading (${heading}) & Jumping (${jumping}), tim rentan kalah duel udara di kotak penalti.`,
          severity: 'warning',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Gunakan pemain berpostur kekar/bek tengah alami untuk peran IFB.',
        });
      }
    }

    // Inverted Wing-Back Passing Check
    if (role.id === 'iwb') {
      const passing = attrs.passing ?? 10;
      const vision = attrs.vision ?? 10;
      if (passing < 11 || vision < 10) {
        issues.push({
          id: `capacity_iwb_${player.id}`,
          title: `${player.name}: Visi IWB Kurang Memadai`,
          description: `IWB beroperasi sebagai gelandang sentral saat build-up. Dengan Passing (${passing}) & Vision (${vision}), ia akan sering kehilangan bola di lini tengah.`,
          severity: 'warning',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Ubah menjadi Full-Back / Wing-Back biasa, atau latih atribut passing pemain.',
        });
      }
    }

    // Target Forward Aerial Check
    if (role.id === 'target_forward') {
      const jumping = attrs.jumpingReach ?? 10;
      const strength = attrs.strength ?? 10;
      if (jumping < 13 || strength < 13) {
        issues.push({
          id: `capacity_tf_${player.id}`,
          title: `${player.name}: Fisik Target Forward Kurang Dominan`,
          description: `Target Forward harus mendominasi bek lawan di udara. Jumping Reach (${jumping}) dan Kekuatan (${strength}) kurang untuk memenangkan duel bola lambung.`,
          severity: 'danger',
          category: 'player_capacity',
          affectedPositions: [slot.position],
          suggestedFix: 'Ganti role penyerang menjadi Advanced Forward, Deep Lying Forward, atau Poacher.',
        });
      }
    }
  }

  // ========================================================
  // 4. BENTURAN INSTRUKSI TIM VS ROLE (INSTRUCTION CONFLICTS)
  // ========================================================

  // Pass Into Space vs Target Forward / Enganche
  if (teamInstructions.passIntoSpace) {
    const staticAttackers = slots.filter(s => s.roleId === 'target_forward' || s.roleId === 'enganche');
    if (staticAttackers.length > 0) {
      issues.push({
        id: 'ti_pass_into_space_clash',
        title: 'Instruksi Pass Into Space Bertolak Belakang dengan Target Forward/Enganche',
        description: 'Pass Into Space meminta tim mengoper ke ruang kosong bagi pelari cepat. Namun Target Forward dan Enganche menuntut bola dialirkan langsung ke kaki/badan mereka.',
        severity: 'warning',
        category: 'instruction_conflict',
        suggestedFix: 'Matikan Pass Into Space, atau ganti striker menjadi Advanced Forward / Inside Forward.',
      });
    }
  }

  // Look for Overlap vs Defend Full-Backs
  if (teamInstructions.overlapLeft && leftBack && leftBack.duty === 'Defend') {
    issues.push({
      id: 'ti_overlap_left_clash',
      title: 'Overlap Kiri Macet: Bek Sayap Kiri Bertugas Defend',
      description: 'Pemain sayap kiri diinstruksikan menahan bola menunggu bek kiri overlap. Namun bek kiri bertugas Defend sehingga tidak akan pernah maju menyerang.',
      severity: 'danger',
      category: 'instruction_conflict',
      affectedPositions: [leftBack.position],
      suggestedFix: 'Ubah tugas bek kiri menjadi Support/Attack, atau matikan Look for Overlap Kiri.',
    });
  }
  if (teamInstructions.overlapRight && rightBack && rightBack.duty === 'Defend') {
    issues.push({
      id: 'ti_overlap_right_clash',
      title: 'Overlap Kanan Macet: Bek Sayap Kanan Bertugas Defend',
      description: 'Pemain sayap kanan menahan bola menunggu overlap yang tidak akan pernah datang karena bek kanan bertugas Defend.',
      severity: 'danger',
      category: 'instruction_conflict',
      affectedPositions: [rightBack.position],
      suggestedFix: 'Ubah tugas bek kanan menjadi Support/Attack, atau matikan Look for Overlap Kanan.',
    });
  }

  // Look for Underlap vs Mezzala / Inside Forward
  if (teamInstructions.underlapLeft && leftWing && leftWing.roleId === 'inside_forward') {
    issues.push({
      id: 'ti_underlap_left_clash',
      title: 'Underlap Kiri Benturan dengan Inside Forward',
      description: 'Underlap meminta bek sayap memotong ke koridor dalam (half-space). Namun koridor dalam tersebut sudah ditempati oleh Inside Forward yang memotong ke dalam.',
      severity: 'warning',
      category: 'instruction_conflict',
      suggestedFix: 'Gunakan Underlap hanya jika sayap diisi oleh Winger murni yang menempel garis tepi.',
    });
  }

  // High Defensive Line vs Traditional GK
  const gkSlot = slots.find(s => s.position === 'GK');
  if ((teamInstructions.defensiveLine === 'higher' || teamInstructions.defensiveLine === 'much_higher') && gkSlot && gkSlot.roleId === 'gk') {
    issues.push({
      id: 'ti_high_line_gk_clash',
      title: 'High Defensive Line Membutuhkan Sweeper Keeper',
      description: 'Garis pertahanan tinggi menyisakan ruang 30 meter di belakang bek. Kiper tradisional hanya diam di garis gawang dan tidak akan keluar menyapu umpan terobosan lawan.',
      severity: 'danger',
      category: 'instruction_conflict',
      affectedPositions: [gkSlot.position],
      suggestedFix: 'Ubah peran kiper menjadi Sweeper Keeper (Support atau Attack).',
    });
  }

  // Midfield Canyon Trap: High Press LOE + Lower Defensive Line (GuideToFootball)
  if (teamInstructions.lineOfEngagement === 'high_press' &&
      (teamInstructions.defensiveLine === 'lower' || teamInstructions.defensiveLine === 'much_lower')) {
    issues.push({
      id: 'ti_midfield_canyon',
      title: 'Perangkap Celah Raksasa (Midfield Canyon Trap)',
      description: 'Lini serang menekan sangat tinggi di kotak penalti lawan (High Press), sementara lini belakang bertahan sangat dalam. Tercipta lubang selebar 40 meter di lini tengah yang mudah dieksploitasi lawan menurut GuideToFootball.',
      severity: 'danger',
      category: 'instruction_conflict',
      suggestedFix: 'Kompakkan garis: naikkan Defensive Line ke Higher, atau turunkan Line of Engagement ke Mid-block.',
    });
  }

  // GuideToFootball: Mentality vs Defensive Block Conflict
  if ((teamInstructions.mentality === 'attacking' || teamInstructions.mentality === 'very_attacking') &&
      teamInstructions.lineOfEngagement === 'low_block') {
    issues.push({
      id: 'ti_mentality_lowblock_conflict',
      title: 'Konflik Mentalitas Menyerang vs Low Block (GuideToFootball)',
      description: 'Mentalitas tim disetel Agresif/Menyerang, namun Line of Engagement dipasang Low Block (sangat dalam). Pemain serang akan bingung antara dorongan mengambil risiko maju dengan kewajiban bertahan di depan kotak penalti sendiri.',
      severity: 'danger',
      category: 'instruction_conflict',
      suggestedFix: 'Naikkan Line of Engagement ke Mid-block atau High Press, atau turunkan mentalitas menjadi Cautious / Defensive.',
    });
  }

  if ((teamInstructions.mentality === 'very_defensive' || teamInstructions.mentality === 'defensive') &&
      teamInstructions.lineOfEngagement === 'high_press') {
    issues.push({
      id: 'ti_mentality_highpress_conflict',
      title: 'Konflik Mentalitas Bertahan vs High Press (GuideToFootball)',
      description: 'Mentalitas tim disetel Bertahan (risk-averse), namun tim diinstruksikan melakukan High Press. Penyerang menekan sendirian sementara pemain belakang menolak mengambil risiko naik ke garis tengah.',
      severity: 'warning',
      category: 'instruction_conflict',
      suggestedFix: 'Gunakan Mid-Block atau Low Block untuk mentalitas bertahan, atau naikkan mentalitas ke Positive.',
    });
  }

  // Early Crosses vs Solo Short Striker
  if (teamInstructions.earlyCrosses && strikers.length === 1) {
    const soloStriker = getAssignedPlayer(strikers[0]);
    if (soloStriker && (soloStriker.attributes.jumpingReach ?? 10) < 11 && (soloStriker.attributes.heading ?? 10) < 11) {
      issues.push({
        id: 'ti_early_cross_short_striker',
        title: 'Early Crosses Sia-sia pada Striker Tunggal Mungil',
        description: `Striker tunggal (${soloStriker.name}) memiliki Jumping Reach rendah (${soloStriker.attributes.jumpingReach ?? 10}). Umpan silang dini lambung akan dengan mudah disapu oleh bek lawan.`,
        severity: 'warning',
        category: 'instruction_conflict',
        suggestedFix: 'Matikan Early Crosses dan aktifkan Work Ball Into Box.',
      });
    }
  }

  // GuideToFootball: Work Ball Into Box vs Early Crosses Conflict
  if (teamInstructions.workBallIntoBox && teamInstructions.earlyCrosses) {
    issues.push({
      id: 'ti_workball_earlycross_clash',
      title: 'Benturan Filosofi Menyerang: Work Ball Into Box vs Early Crosses (GuideToFootball)',
      description: 'Work Ball Into Box menuntut pemain bersabar menembus kotak penalti dengan kombinasi umpan pendek, namun Early Crosses memerintahkan pemain langsung mengumpan silang dini dari jauh. Dua instruksi ini saling meniadakan.',
      severity: 'danger',
      category: 'instruction_conflict',
      suggestedFix: 'Pilih salah satu pendekatan: matikan Early Crosses untuk tiki-taka/possession, atau matikan Work Ball Into Box untuk direct wing-play.',
    });
  }

  // GuideToFootball: High Press LOE vs Regroup Transition Conflict
  if (teamInstructions.lineOfEngagement === 'high_press' && teamInstructions.whenLostPossession === 'regroup') {
    issues.push({
      id: 'ti_high_press_regroup_clash',
      title: 'Benturan Transisi: Garis Serang Tinggi vs Regroup (GuideToFootball)',
      description: 'Garis serang (Line of Engagement) dipasang High Press untuk menekan pertahanan lawan, namun instruksi transisi disetel "Regroup" (segera mundur saat kehilangan bola). Penyerang akan kebingungan antara mengejar bola atau langsung berlari mundur.',
      severity: 'warning',
      category: 'instruction_conflict',
      suggestedFix: 'Ubah When Lost Possession menjadi "Counter-Press" untuk mendukung high-block pressing terpadu.',
    });
  }

  // GuideToFootball: Low Defensive Line vs Counter-Press Transition Conflict
  if ((teamInstructions.defensiveLine === 'lower' || teamInstructions.defensiveLine === 'much_lower') && teamInstructions.whenLostPossession === 'counter_press') {
    issues.push({
      id: 'ti_low_block_counterpress_clash',
      title: 'Benturan Transisi: Low Block vs Counter-Press (GuideToFootball)',
      description: 'Garis pertahanan sangat dalam (Low Block), namun tim diinstruksikan melakukan "Counter-Press" agresif saat kehilangan bola. Gelandang dan bek akan tertarik maju ke depan meninggalkan kerapatan blok pertahanan rendah.',
      severity: 'warning',
      category: 'instruction_conflict',
      suggestedFix: 'Ubah When Lost Possession menjadi "Regroup" agar tim segera merapatkan formasi di blok rendah.',
    });
  }

  // GuideToFootball: Floated Crosses vs Short Aerial Attack
  if (teamInstructions.crossType === 'floated' && strikers.length > 0) {
    const avgJumping = strikers.reduce((acc, s) => {
      const p = getAssignedPlayer(s);
      return acc + (p?.attributes.jumpingReach ?? 10);
    }, 0) / strikers.length;

    if (avgJumping < 12) {
      issues.push({
        id: 'ti_floated_cross_weak_aerial',
        title: 'Floated Crosses Kurang Efektif Tanpa Striker Berpostur Jangkung (GuideToFootball)',
        description: 'Umpan silang melambung tinggi (Floated Crosses) memberi waktu bek lawan untuk melompat duel. Rata-rata Jumping Reach striker Anda di bawah 12.',
        severity: 'info',
        category: 'instruction_conflict',
        suggestedFix: 'Gunakan Low Crosses (umpan mendatar) atau Whipped Crosses (umpan deras) yang lebih mengandalkan kecepatan dan antisipasi.',
      });
    }
  }

  // ========================================================
  // 5. BENTURAN PLAYER INSTRUCTION VS TEAM INSTRUCTION
  // ========================================================
  // 1. Work Ball Into Box vs Shoot More Often
  if (teamInstructions.workBallIntoBox) {
    const shootMoreSlots = slots.filter(s => s.customPIs?.includes('shoot_more_often') || getSlotRole(s)?.hardcodedPIs?.includes('shoot_more_often'));
    const midfieldShooters = shootMoreSlots.filter(s => s.position === 'MC' || s.position === 'DM');
    if (midfieldShooters.length > 0) {
      issues.push({
        id: 'pi_work_ball_shoot_clash',
        title: 'Benturan TI: Work Ball Into Box vs PI: Shoot More Often',
        description: 'Tim diinstruksikan sabar mengalirkan bola ke kotak penalti, namun gelandang memiliki instruksi tembak spekulatif (Shoot More Often) yang membuang momentum.',
        severity: 'warning',
        category: 'pi_ti_clash',
        affectedPositions: midfieldShooters.map(s => s.position),
        suggestedFix: 'Hapus PI Shoot More Often pada gelandang tengah agar fokus menyuplai bola ke kotak penalti.',
      });
    }
  }

  // 2. Play Out of Defence vs CB Take More Risks / Direct Passing
  if (teamInstructions.playOutOfDefence) {
    const riskyCBs = slots.filter(s => s.position === 'DC' && (s.customPIs?.includes('take_more_risks') || getSlotRole(s)?.hardcodedPIs?.includes('take_more_risks')));
    if (riskyCBs.length > 0) {
      issues.push({
        id: 'pi_pood_risky_cb_clash',
        title: 'Benturan TI: Play Out of Defence vs PI: Take More Risks pada Bek Tengah',
        description: 'Tim diminta sabar mengalirkan bola dari belakang, namun bek tengah memiliki PI Take More Risks yang memicu operan lambung spekulatif.',
        severity: 'warning',
        category: 'pi_ti_clash',
        affectedPositions: riskyCBs.map(s => s.position),
        suggestedFix: 'Kembalikan passing bek ke Shorter atau Fewer Risky Passes.',
      });
    }
  }

  // 3. Pass Into Space vs Fewer Risky Passes
  if (teamInstructions.passIntoSpace) {
    const safePassers = slots.filter(s => (s.position === 'AMC' || s.position === 'MC') && (s.customPIs?.includes('fewer_risky_passes') || getSlotRole(s)?.hardcodedPIs?.includes('fewer_risky_passes')));
    if (safePassers.length > 0) {
      issues.push({
        id: 'pi_pass_space_safe_pass_clash',
        title: 'Benturan TI: Pass Into Space vs PI: Fewer Risky Passes pada Playmaker',
        description: 'Tim mengandalkan umpan terobosan ke ruang lari, namun pengatur serangan memiliki instruksi operan aman (Fewer Risky Passes) sehingga jarang melepaskan umpan terobosan.',
        severity: 'warning',
        category: 'pi_ti_clash',
        affectedPositions: safePassers.map(s => s.position),
        suggestedFix: 'Berikan PI Take More Risks pada playmaker.',
      });
    }
  }

  // 4. Dribble Mode Clashes
  if (teamInstructions.dribbleMode === 'dribble_less') {
    const dribblers = slots.filter(s => s.customPIs?.includes('dribble_more') || getSlotRole(s)?.hardcodedPIs?.includes('dribble_more'));
    if (dribblers.length > 0) {
      issues.push({
        id: 'pi_dribble_less_ti_clash',
        title: 'Benturan TI: Dribble Less vs PI: Dribble More',
        description: 'Instruksi tim memerintahkan membatasi dribel bola, namun pemain memiliki instruksi individu Dribble More.',
        severity: 'warning',
        category: 'pi_ti_clash',
        affectedPositions: dribblers.map(s => s.position),
        suggestedFix: 'Sinkronkan dribel mode tim atau sesuaikan PI pemain.',
      });
    }
  }

  // 5. Early Crosses vs Cross Less Often
  if (teamInstructions.earlyCrosses) {
    const reluctantCrossers = slots.filter(s => (s.position === 'AMR' || s.position === 'AML' || s.position === 'DR' || s.position === 'DL') && s.customPIs?.includes('cross_less_often'));
    if (reluctantCrossers.length > 0) {
      issues.push({
        id: 'pi_early_cross_less_clash',
        title: 'Benturan TI: Hit Early Crosses vs PI: Cross Less Often pada Sayap',
        description: 'Tim diinstruksikan segera mengirim umpan silang dini, namun pemain sayap memiliki PI Cross Less Often yang menolak melepaskan umpan silang.',
        severity: 'warning',
        category: 'pi_ti_clash',
        affectedPositions: reluctantCrossers.map(s => s.position),
        suggestedFix: 'Hapus PI Cross Less Often pada sayap.',
      });
    }
  }

  // 6. Trap Outside vs Sit Narrower pada Fullbacks
  if (teamInstructions.defensiveTraps === 'trap_outside') {
    const narrowBacks = slots.filter(s => (s.position === 'DR' || s.position === 'DL') && (s.customPIs?.includes('sit_narrower') || getSlotRole(s)?.hardcodedPIs?.includes('sit_narrower')));
    if (narrowBacks.length > 0) {
      issues.push({
        id: 'pi_trap_outside_narrow_fb_clash',
        title: 'Benturan TI: Trap Outside vs PI: Sit Narrower pada Bek Sayap',
        description: 'Tim ingin menjebak lawan ke garis luar (Trap Outside), namun bek sayap bermain menyempit ke tengah (Sit Narrower), membiarkan sayap lawan leluasa tanpa kawalan.',
        severity: 'danger',
        category: 'pi_ti_clash',
        affectedPositions: narrowBacks.map(s => s.position),
        suggestedFix: 'Hapus Sit Narrower atau gunakan Stay Wider pada bek sayap.',
      });
    }
  }

  return issues;
}

export interface TacticalHealthPillars {
  gk: { count: number; status: 'ok' | 'missing' | 'excess' };
  def: { count: number; cbCount: number; status: 'ok' | 'insufficient' | 'missing' | 'no_cb' | 'excess' };
  mid: { count: number; dmCount: number; amCount: number; status: 'ok' | 'isolated' | 'missing' | 'excess' };
  att: { count: number; isStrikerlessValid: boolean; status: 'ok' | 'missing' | 'strikerless_ok' | 'excess' };
}

export interface TacticalHealthResult {
  score: number; // 0 - 100
  layer1Score: number; // 0 - 40 (Posisi Inti: Kiper, Bek, Gelandang, Penyerang)
  layer2Score: number; // 0 - 25 (Harmoni Ruang & Peran)
  layer3Score: number; // 0 - 20 (Duty & Rest Defence)
  layer4Score: number; // 0 - 15 (Instruksi Tim, PI, Kapasitas)
  isLayer1Valid: boolean;
  fatalError?: string;
  status: 'optimal' | 'good' | 'fragile' | 'unplayable';
  pillars: TacticalHealthPillars;
}

export function calculateTacticalHealth(
  slots: TacticSlot[],
  issues: TacticalIssue[]
): TacticalHealthResult {
  const gkCount = slots.filter(s => s.position === 'GK').length;
  const defSlots = slots.filter(s => ['DC', 'DL', 'DR', 'WBL', 'WBR'].includes(s.position));
  const defCount = defSlots.length;
  const cbCount = slots.filter(s => s.position === 'DC').length;
  // Midfield mencakup DM, MC/ML/MR, dan AMC/AML/AMR
  const midSlots = slots.filter(s => ['DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR'].includes(s.position));
  const midCount = midSlots.length;
  const dmCount = slots.filter(s => s.position === 'DM').length;
  const amCount = slots.filter(s => ['AMC', 'AML', 'AMR'].includes(s.position)).length;
  // Attacker murni adalah Striker (STC)
  const strikerSlots = slots.filter(s => s.position === 'STC');
  const strikerCount = strikerSlots.length;

  const hasBoxRunnerFromAM = slots.some(s =>
    ['AMC', 'AML', 'AMR'].includes(s.position) &&
    (['shadow_striker', 'inside_forward', 'inverted_winger'].includes(s.roleId) || s.duty === 'Attack')
  );

  // ----------------------------------------------------
  // Status 4 Pilar Posisi Inti
  // ----------------------------------------------------
  let gkStatus: 'ok' | 'missing' | 'excess' = 'ok';
  if (gkCount === 0) gkStatus = 'missing';
  else if (gkCount > 1) gkStatus = 'excess';

  let defStatus: 'ok' | 'insufficient' | 'missing' | 'no_cb' | 'excess' = 'ok';
  if (defCount === 0) defStatus = 'missing';
  else if (defCount < 3) defStatus = 'insufficient';
  else if (cbCount === 0) defStatus = 'no_cb';
  else if (defCount > 5) defStatus = 'excess';

  let midStatus: 'ok' | 'isolated' | 'missing' | 'excess' = 'ok';
  if (midCount === 0) midStatus = 'missing';
  else if (midCount < 2) midStatus = 'isolated';
  else if (midCount > 7) midStatus = 'excess';

  let attStatus: 'ok' | 'missing' | 'strikerless_ok' | 'excess' = 'ok';
  if (strikerCount === 0) {
    attStatus = hasBoxRunnerFromAM ? 'strikerless_ok' : 'missing';
  } else if (strikerCount > 3) {
    attStatus = 'excess';
  }

  const pillars: TacticalHealthPillars = {
    gk: { count: gkCount, status: gkStatus },
    def: { count: defCount, cbCount, status: defStatus },
    mid: { count: midCount, dmCount, amCount, status: midStatus },
    att: { count: strikerCount, isStrikerlessValid: hasBoxRunnerFromAM, status: attStatus },
  };

  // ----------------------------------------------------
  // LAYER 1: POSISI INTI WAJIB (Maksimal 40 Poin)
  // ----------------------------------------------------
  let layer1Score = 40;
  let isLayer1Valid = true;
  let fatalError: string | undefined;

  // 1. Kiper
  if (gkCount === 0) {
    layer1Score -= 40;
    isLayer1Valid = false;
    fatalError = 'Ketiadaan Penjaga Gawang (0 GK)';
  } else if (gkCount > 1) {
    layer1Score -= 25;
    isLayer1Valid = false;
    fatalError = `Lebih dari 1 Kiper (${gkCount} GK)`;
  }

  // 2. Bek
  if (defCount === 0) {
    layer1Score -= 35;
    isLayer1Valid = false;
    if (!fatalError) fatalError = 'Ketiadaan Lini Pertahanan (0 Bek)';
  } else if (defCount < 3) {
    layer1Score -= (3 - defCount) * 12;
    if (defCount <= 1) {
      isLayer1Valid = false;
      if (!fatalError) fatalError = 'Lini Pertahanan Sangat Minim (< 2 Bek)';
    }
  } else if (defCount > 5) {
    layer1Score -= 8;
  }

  if (defCount > 0 && cbCount === 0) {
    layer1Score -= 12;
  }

  // 3. Gelandang (DM, MC/ML/MR, AMC/AML/AMR)
  if (midCount === 0) {
    layer1Score -= 30;
    isLayer1Valid = false;
    if (!fatalError) fatalError = 'Ketiadaan Lini Tengah (0 Gelandang)';
  } else if (midCount < 2) {
    layer1Score -= 15;
  } else if (midCount > 7) {
    layer1Score -= 8;
  }

  // 4. Penyerang / Ujung Tombak (STC)
  if (strikerCount === 0) {
    if (!hasBoxRunnerFromAM) {
      layer1Score -= 25;
      isLayer1Valid = false;
      if (!fatalError) fatalError = 'Ketiadaan Penyerang / Ujung Tombak (0 STC)';
    } else {
      layer1Score -= 4; // Penalti minor untuk sistem strikerless
    }
  } else if (strikerCount > 3) {
    layer1Score -= 12;
  }

  // 5. Total Skuad 11 Pemain
  if (slots.length !== 11) {
    const diff = Math.abs(11 - slots.length);
    layer1Score -= Math.min(20, diff * 8);
    if (slots.length < 10) isLayer1Valid = false;
  }

  layer1Score = Math.max(0, layer1Score);

  // ----------------------------------------------------
  // LAYER 2: HARMONI RUANG & KEMITRAAN PERAN (Maksimal 25 Poin)
  // ----------------------------------------------------
  let layer2Score = 25;
  const spaceIssues = issues.filter(i => i.category === 'space_clash');
  for (const issue of spaceIssues) {
    if (issue.severity === 'danger') layer2Score -= 8;
    else if (issue.severity === 'warning') layer2Score -= 4;
    else layer2Score -= 1.5;
  }
  layer2Score = Math.max(0, layer2Score);

  // ----------------------------------------------------
  // LAYER 3: KESEIMBANGAN DUTY & REST DEFENCE (Maksimal 20 Poin)
  // ----------------------------------------------------
  let layer3Score = 20;
  const dutyIssues = issues.filter(i => i.category === 'duty_balance');
  for (const issue of dutyIssues) {
    if (issue.severity === 'danger') layer3Score -= 7;
    else if (issue.severity === 'warning') layer3Score -= 3.5;
    else layer3Score -= 1;
  }
  layer3Score = Math.max(0, layer3Score);

  // ----------------------------------------------------
  // LAYER 4: INSTRUKSI TIM, PI, & KAPASITAS (Maksimal 15 Poin)
  // ----------------------------------------------------
  let layer4Score = 15;
  const instructionAndPlayerIssues = issues.filter(i =>
    ['instruction_conflict', 'pi_ti_clash', 'player_capacity'].includes(i.category)
  );
  for (const issue of instructionAndPlayerIssues) {
    if (issue.severity === 'danger') layer4Score -= 5;
    else if (issue.severity === 'warning') layer4Score -= 2.5;
    else layer4Score -= 1;
  }
  layer4Score = Math.max(0, layer4Score);

  // ----------------------------------------------------
  // TOTAL SKOR & CAPPING JIKA LAYER 1 (POSISI INTI) GAGAL
  // ----------------------------------------------------
  let totalScore = Math.round(layer1Score + layer2Score + layer3Score + layer4Score);

  // JIKA LAYER 1 GAGAL (MISAL: TANPA KIPER, TANPA BEK, TANPA MID, ATAU TANPA STRIKER):
  // Taktik TIDAK BOLEH bernilai tinggi!
  if (!isLayer1Valid) {
    if (gkCount === 0) {
      // Tanpa kiper: skor maksimal 18%
      totalScore = Math.min(totalScore, 18);
    } else if (defCount === 0 || midCount === 0 || (strikerCount === 0 && !hasBoxRunnerFromAM)) {
      // Tanpa salah satu lini utama: skor maksimal 25%
      totalScore = Math.min(totalScore, 25);
    } else {
      totalScore = Math.min(totalScore, 35);
    }
  }

  totalScore = Math.max(0, Math.min(100, totalScore));

  let status: 'optimal' | 'good' | 'fragile' | 'unplayable' = 'optimal';
  if (!isLayer1Valid || totalScore < 30) status = 'unplayable';
  else if (totalScore < 60) status = 'fragile';
  else if (totalScore < 80) status = 'good';

  return {
    score: totalScore,
    layer1Score,
    layer2Score,
    layer3Score,
    layer4Score,
    isLayer1Valid,
    fatalError,
    status,
    pillars,
  };
}
