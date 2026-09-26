import { FormationTemplate, TacticSlot } from '../types';

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  // ================= 1. 4-3-3 DM WIDE =================
  {
    id: '433_dm_wide',
    name: '4-3-3 DM Wide (Modern Gegenpress)',
    category: '4_back',
    description: 'Formasi paling fleksibel dan seimbang di FM24. Memadukan single pivot kokoh, dua gelandang sentral dinamis, dan sepasang sayap penusuk.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Defend' },
      { slotId: 'dr', position: 'DR', x: 86, y: 72, roleId: 'fb', duty: 'Support' },
      { slotId: 'dcr', position: 'DC', x: 63, y: 75, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 37, y: 75, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 72, roleId: 'wb', duty: 'Attack' },
      { slotId: 'dm', position: 'DM', x: 50, y: 58, roleId: 'dlp_dm', duty: 'Defend' },
      { slotId: 'mcr', position: 'MC', x: 65, y: 44, roleId: 'bbm', duty: 'Support' },
      { slotId: 'mcl', position: 'MC', x: 35, y: 44, roleId: 'mezzala', duty: 'Attack' },
      { slotId: 'amr', position: 'AMR', x: 85, y: 25, roleId: 'winger', duty: 'Support' },
      { slotId: 'aml', position: 'AML', x: 15, y: 25, roleId: 'inside_forward', duty: 'Attack' },
      { slotId: 'stc', position: 'STC', x: 50, y: 14, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 2. 4-2-3-1 DM WIDE =================
  {
    id: '4231_dm_wide',
    name: '4-2-3-1 DM Wide (Double Pivot Control)',
    category: '4_back',
    description: 'Sangat kokoh saat pressing tinggi berkat perlindungan dua DM dan daya gedor nomor 10 di belakang striker.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Support' },
      { slotId: 'dr', position: 'DR', x: 86, y: 72, roleId: 'wb', duty: 'Support' },
      { slotId: 'dcr', position: 'DC', x: 63, y: 75, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 37, y: 75, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 72, roleId: 'wb', duty: 'Attack' },
      { slotId: 'dmr', position: 'DM', x: 62, y: 58, roleId: 'segundo_volante', duty: 'Support' },
      { slotId: 'dml', position: 'DM', x: 38, y: 58, roleId: 'anchor', duty: 'Defend' },
      { slotId: 'amc', position: 'AMC', x: 50, y: 34, roleId: 'ap_amc', duty: 'Attack' },
      { slotId: 'amr', position: 'AMR', x: 85, y: 25, roleId: 'inside_forward', duty: 'Support' },
      { slotId: 'aml', position: 'AML', x: 15, y: 25, roleId: 'inside_forward', duty: 'Attack' },
      { slotId: 'stc', position: 'STC', x: 50, y: 14, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 3. 4-4-2 FLAT =================
  {
    id: '442_flat',
    name: '4-4-2 Flat (Classic Two Banks of Four)',
    category: '4_back',
    description: 'Struktur pertahanan disiplin dengan ancaman serangan balik langsung melalui kemitraan dua striker.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'gk', duty: 'Defend' },
      { slotId: 'dr', position: 'DR', x: 86, y: 72, roleId: 'fb', duty: 'Defend' },
      { slotId: 'dcr', position: 'DC', x: 63, y: 75, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 37, y: 75, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 72, roleId: 'fb', duty: 'Support' },
      { slotId: 'mr', position: 'AMR', x: 86, y: 46, roleId: 'winger', duty: 'Attack' },
      { slotId: 'mcr', position: 'MC', x: 63, y: 48, roleId: 'cm', duty: 'Defend' },
      { slotId: 'mcl', position: 'MC', x: 37, y: 48, roleId: 'bbm', duty: 'Support' },
      { slotId: 'ml', position: 'AML', x: 14, y: 46, roleId: 'winger', duty: 'Support' },
      { slotId: 'stcr', position: 'STC', x: 60, y: 16, roleId: 'target_forward', duty: 'Support' },
      { slotId: 'stcl', position: 'STC', x: 40, y: 16, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 4. 5-3-2 / 3-5-2 WB =================
  {
    id: '532_wb',
    name: '5-3-2 / 3-5-2 Wing-Back (Fluid Counter)',
    category: '3_5_back',
    description: 'Kombinasi 3 bek tengah kokoh dengan 2 wing-back bebas menyisir sayap dan dominasi 3 gelandang di tengah.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Defend' },
      { slotId: 'dcr', position: 'DC', x: 70, y: 76, roleId: 'wcb', duty: 'Support' },
      { slotId: 'dc', position: 'DC', x: 50, y: 78, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 30, y: 76, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'wbr', position: 'DR', x: 88, y: 60, roleId: 'cwb', duty: 'Support' },
      { slotId: 'wbl', position: 'DL', x: 12, y: 60, roleId: 'wb', duty: 'Attack' },
      { slotId: 'dm', position: 'DM', x: 50, y: 52, roleId: 'anchor', duty: 'Defend' },
      { slotId: 'mcr', position: 'MC', x: 64, y: 40, roleId: 'bbm', duty: 'Support' },
      { slotId: 'mcl', position: 'MC', x: 36, y: 40, roleId: 'mezzala', duty: 'Attack' },
      { slotId: 'stcr', position: 'STC', x: 60, y: 15, roleId: 'dlf', duty: 'Support' },
      { slotId: 'stcl', position: 'STC', x: 40, y: 15, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 5. 3-4-2-1 BOX MIDFIELD (ALONSO STYLE) =================
  {
    id: '3421_box',
    name: '3-4-2-1 Box Midfield (Xabi Alonso Style)',
    category: '3_5_back',
    description: 'Formasi taktis modern dengan 2 DM dan 2 AMC yang membentuk kotak di lini tengah, menguasai half-space secara dominan.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Support' },
      { slotId: 'dcr', position: 'DC', x: 70, y: 76, roleId: 'wcb', duty: 'Support' },
      { slotId: 'dc', position: 'DC', x: 50, y: 78, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 30, y: 76, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'wbr', position: 'DR', x: 88, y: 56, roleId: 'wb', duty: 'Attack' },
      { slotId: 'wbl', position: 'DL', x: 12, y: 56, roleId: 'wb', duty: 'Attack' },
      { slotId: 'dmr', position: 'DM', x: 62, y: 54, roleId: 'dlp_dm', duty: 'Defend' },
      { slotId: 'dml', position: 'DM', x: 38, y: 54, roleId: 'dm', duty: 'Support' },
      { slotId: 'amcr', position: 'AMC', x: 64, y: 32, roleId: 'am_amc', duty: 'Attack' },
      { slotId: 'amcl', position: 'AMC', x: 36, y: 32, roleId: 'ap_amc', duty: 'Support' },
      { slotId: 'stc', position: 'STC', x: 50, y: 14, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 6. 4-4-2 NARROW DIAMOND =================
  {
    id: '442_diamond',
    name: '4-4-2 Narrow Diamond (Central Overload)',
    category: 'narrow',
    description: 'Dominasi mutlak 4 gelandang di lini tengah tanpa pemain sayap. Sangat mematikan jika memiliki bek sayap berkemampuan crossing tinggi.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Defend' },
      { slotId: 'dr', position: 'DR', x: 86, y: 68, roleId: 'cwb', duty: 'Attack' },
      { slotId: 'dcr', position: 'DC', x: 63, y: 76, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 37, y: 76, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 68, roleId: 'cwb', duty: 'Attack' },
      { slotId: 'dm', position: 'DM', x: 50, y: 58, roleId: 'anchor', duty: 'Defend' },
      { slotId: 'mcr', position: 'MC', x: 65, y: 44, roleId: 'carrilero', duty: 'Support' },
      { slotId: 'mcl', position: 'MC', x: 35, y: 44, roleId: 'mezzala', duty: 'Support' },
      { slotId: 'amc', position: 'AMC', x: 50, y: 30, roleId: 'ap_amc', duty: 'Attack' },
      { slotId: 'stcr', position: 'STC', x: 60, y: 15, roleId: 'af', duty: 'Attack' },
      { slotId: 'stcl', position: 'STC', x: 40, y: 15, roleId: 'dlf', duty: 'Support' },
    ],
  },

  // ================= 7. ASYMMETRIC 3-2-4-1 (DYNAMIC BOX PEP/ARTETA) =================
  {
    id: 'asym_3241_box',
    name: 'Asymmetric 3-2-4-1 (Pep / Arteta Dynamic Box)',
    category: 'asymmetric',
    description: 'Taktik asimetris FM24 paling mematikan. Bek kanan (IFB) masuk ke tengah membentuk 3 bek rata, sementara bek kiri (WB-A) naik bebas menyisir sepertiga akhir.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Support' },
      { slotId: 'dr', position: 'DR', x: 82, y: 76, roleId: 'ifb', duty: 'Defend' },
      { slotId: 'dcr', position: 'DC', x: 62, y: 78, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 38, y: 78, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 62, roleId: 'wb', duty: 'Attack' },
      { slotId: 'dmr', position: 'DM', x: 60, y: 54, roleId: 'dlp_dm', duty: 'Defend' },
      { slotId: 'dml', position: 'DM', x: 40, y: 54, roleId: 'segundo_volante', duty: 'Attack' },
      { slotId: 'amc', position: 'AMC', x: 50, y: 32, roleId: 'ap_amc', duty: 'Support' },
      { slotId: 'amr', position: 'AMR', x: 86, y: 26, roleId: 'winger', duty: 'Support' },
      { slotId: 'aml', position: 'AML', x: 18, y: 26, roleId: 'inside_forward', duty: 'Attack' },
      { slotId: 'stc', position: 'STC', x: 50, y: 14, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 8. ASYMMETRIC STAGGERED PIVOT =================
  {
    id: 'asym_staggered_pivot',
    name: 'Asymmetric Staggered Pivot (Tiered Midfield)',
    category: 'asymmetric',
    description: 'Gelandang bertingkat: 1 DM di kanan (Anchor) dan 1 MC di kiri (BBM). Menghindari garis operan sejajar dan menciptakan sudut segitiga alami.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Defend' },
      { slotId: 'dr', position: 'DR', x: 86, y: 72, roleId: 'fb', duty: 'Support' },
      { slotId: 'dcr', position: 'DC', x: 63, y: 76, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 37, y: 76, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 72, roleId: 'wb', duty: 'Support' },
      { slotId: 'dmr', position: 'DM', x: 62, y: 58, roleId: 'anchor', duty: 'Defend' },
      { slotId: 'mcl', position: 'MC', x: 36, y: 44, roleId: 'bbm', duty: 'Support' },
      { slotId: 'amc', position: 'AMC', x: 52, y: 32, roleId: 'ap_amc', duty: 'Attack' },
      { slotId: 'amr', position: 'AMR', x: 86, y: 25, roleId: 'inside_forward', duty: 'Attack' },
      { slotId: 'aml', position: 'AML', x: 14, y: 25, roleId: 'winger', duty: 'Support' },
      { slotId: 'stc', position: 'STC', x: 50, y: 14, roleId: 'af', duty: 'Attack' },
    ],
  },

  // ================= 9. ASYMMETRIC FLANK OVERLOAD & ISOLATION =================
  {
    id: 'asym_overload_isolation',
    name: 'Asymmetric Flank Overload (Left Overload, Right Isolation)',
    category: 'asymmetric',
    description: 'Memancing lawan ke sisi kiri dengan kombinasi 3 pemain, lalu melepaskan umpan diagonal ke sayap kanan murni dalam duel 1 vs 1 terbuka lebar.',
    slots: [
      { slotId: 'gk', position: 'GK', x: 50, y: 90, roleId: 'sk', duty: 'Defend' },
      { slotId: 'dr', position: 'DR', x: 86, y: 74, roleId: 'fb', duty: 'Defend' },
      { slotId: 'dcr', position: 'DC', x: 63, y: 76, roleId: 'cd', duty: 'Defend' },
      { slotId: 'dcl', position: 'DC', x: 37, y: 76, roleId: 'bpd', duty: 'Defend' },
      { slotId: 'dl', position: 'DL', x: 14, y: 66, roleId: 'iwb', duty: 'Support' },
      { slotId: 'dm', position: 'DM', x: 48, y: 56, roleId: 'anchor', duty: 'Defend' },
      { slotId: 'mcr', position: 'MC', x: 68, y: 44, roleId: 'carrilero', duty: 'Support' },
      { slotId: 'mcl', position: 'MC', x: 32, y: 40, roleId: 'mezzala', duty: 'Attack' },
      { slotId: 'amr', position: 'AMR', x: 88, y: 24, roleId: 'winger', duty: 'Attack' },
      { slotId: 'aml', position: 'AML', x: 18, y: 28, roleId: 'inside_forward', duty: 'Support' },
      { slotId: 'stc', position: 'STC', x: 50, y: 14, roleId: 'af', duty: 'Attack' },
    ],
  },
];

export function getFormationById(id: string): FormationTemplate | undefined {
  return FORMATION_TEMPLATES.find(f => f.id === id);
}

export interface DetectedFormation {
  name: string;
  code: string;
  structure: string;
  counts: {
    def: number;
    dm: number;
    mid: number;
    am: number;
    st: number;
  };
  dutyDistribution: {
    defend: number;
    support: number;
    attack: number;
    status: 'balanced' | 'over_attacking' | 'too_defensive' | 'lacks_support';
  };
  restDefenceCount: number;
  restDefenceRating: 'solid' | 'stable' | 'vulnerable' | 'critical';
  flankAnalysis: {
    left: string;
    right: string;
    isAsymmetric: boolean;
  };
  isAsymmetric: boolean;
}

export function detectFormationShape(slots: TacticSlot[]): DetectedFormation {
  const outfield = slots.filter(s => s.position !== 'GK');

  let def = 0;
  let dm = 0;
  let mid = 0;
  let am = 0;
  let st = 0;

  let defendCount = 0;
  let supportCount = 0;
  let attackCount = 0;

  for (const s of outfield) {
    // Duty count
    if (s.duty === 'Attack') attackCount++;
    else if (s.duty === 'Support' || s.duty === 'Automatic') supportCount++;
    else defendCount++;

    // Layer count based on position & Y coordinate
    if (['DC', 'DR', 'DL'].includes(s.position) && s.y >= 68) {
      def++;
    } else if (['DM', 'WBL', 'WBR'].includes(s.position) || (s.y >= 52 && s.y < 68)) {
      dm++;
    } else if (['MC', 'MR', 'ML'].includes(s.position) && (s.y >= 38 && s.y < 52)) {
      mid++;
    } else if (['AMC', 'AMR', 'AML'].includes(s.position) || (s.y >= 20 && s.y < 38)) {
      am++;
    } else {
      st++;
    }
  }

  // Rest defence calculation (CBs, IFBs, Anchor/Holding DMs on Defend)
  let restDefence = 0;
  for (const s of outfield) {
    const isDefDuty = s.duty === 'Defend' || s.duty === 'Cover' || s.duty === 'Stopper';
    if (s.position === 'DC' && isDefDuty) restDefence++;
    else if (s.roleId === 'ifb' && isDefDuty) restDefence++;
    else if (s.position === 'DM' && (s.roleId === 'anchor' || s.roleId === 'half_back' || isDefDuty)) restDefence++;
  }

  let restDefenceRating: 'solid' | 'stable' | 'vulnerable' | 'critical' = 'stable';
  if (restDefence >= 4) restDefenceRating = 'solid';
  else if (restDefence === 3) restDefenceRating = 'stable';
  else if (restDefence === 2) restDefenceRating = 'vulnerable';
  else restDefenceRating = 'critical';

  // Duty distribution status
  let dutyStatus: 'balanced' | 'over_attacking' | 'too_defensive' | 'lacks_support' = 'balanced';
  if (attackCount >= 5) dutyStatus = 'over_attacking';
  else if (defendCount >= 5) dutyStatus = 'too_defensive';
  else if (supportCount <= 1) dutyStatus = 'lacks_support';

  // Flank dynamics
  const leftBack = slots.find(s => s.position === 'DL' || s.position === 'WBL');
  const rightBack = slots.find(s => s.position === 'DR' || s.position === 'WBR');
  const leftWing = slots.find(s => s.position === 'AML' || s.position === 'ML');
  const rightWing = slots.find(s => s.position === 'AMR' || s.position === 'MR');

  const leftText = `${leftBack ? leftBack.roleId.toUpperCase() : 'Empty'}(${leftBack?.duty.slice(0, 1) || '-'}) + ${leftWing ? leftWing.roleId.toUpperCase() : 'Empty'}(${leftWing?.duty.slice(0, 1) || '-'})`;
  const rightText = `${rightBack ? rightBack.roleId.toUpperCase() : 'Empty'}(${rightBack?.duty.slice(0, 1) || '-'}) + ${rightWing ? rightWing.roleId.toUpperCase() : 'Empty'}(${rightWing?.duty.slice(0, 1) || '-'})`;

  const isFlankAsym = (leftBack?.duty !== rightBack?.duty) || (leftBack?.roleId !== rightBack?.roleId) || (leftWing?.duty !== rightWing?.duty);

  // Formation Code deduction
  let code = `${def}-${mid + dm}-${am}-${st}`;
  let name = 'Formasi Kustom';

  if (def === 4 && dm === 1 && mid === 2 && am === 2 && st === 1) {
    code = '4-3-3';
    name = '4-3-3 DM Wide';
  } else if (def === 4 && dm === 2 && am === 3 && st === 1) {
    code = '4-2-3-1';
    name = '4-2-3-1 DM Wide';
  } else if (def === 4 && mid === 4 && st === 2) {
    code = '4-4-2';
    name = '4-4-2 Flat';
  } else if (def === 4 && dm === 1 && mid === 2 && am === 1 && st === 2) {
    code = '4-4-2 Diamond';
    name = '4-4-2 Diamond Narrow';
  } else if (def === 3 && dm === 2 && am === 4 && st === 1) {
    code = '3-2-4-1';
    name = isFlankAsym ? '3-2-4-1 Box (Asimetris)' : '3-2-4-1 Box';
  } else if (def === 3 && mid === 4 && am === 2 && st === 1) {
    code = '3-4-2-1';
    name = '3-4-2-1 Box';
  } else if (def === 5 && mid === 3 && st === 2) {
    code = '5-3-2';
    name = '5-3-2 WB';
  } else if (def === 3 && mid === 5 && st === 2) {
    code = '3-5-2';
    name = '3-5-2 Flat';
  } else {
    // Dynamic naming based on lines
    const parts = [def];
    if (dm > 0) parts.push(dm);
    if (mid > 0) parts.push(mid);
    if (am > 0) parts.push(am);
    if (st > 0) parts.push(st);
    code = parts.join('-');
    name = `${code} ${isFlankAsym ? 'Kustom (Asimetris)' : 'Kustom'}`;
  }

  const structure = `${def} Bek • ${dm > 0 ? `${dm} DM • ` : ''}${mid > 0 ? `${mid} MC • ` : ''}${am > 0 ? `${am} AM • ` : ''}${st} Striker`;

  return {
    name,
    code,
    structure,
    counts: { def, dm, mid, am, st },
    dutyDistribution: {
      defend: defendCount,
      support: supportCount,
      attack: attackCount,
      status: dutyStatus,
    },
    restDefenceCount: restDefence,
    restDefenceRating,
    flankAnalysis: {
      left: leftText,
      right: rightText,
      isAsymmetric: isFlankAsym,
    },
    isAsymmetric: isFlankAsym || (def === 3 && dm === 2),
  };
}
