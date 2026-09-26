import { TacticSlot, TeamInstructions, Player } from '../../types';
import {
  PlayerV2,
  TacticalFindingV2,
  TacticAnalysisV2,
  TacticalMetricsV2,
  PhaseShape,
  DataCompletenessReport,
} from './types';
import { derive4PhaseShape } from './phaseShape';
import { calculateTacticalMetricsV2 } from './metrics';
import { calculateDataCompletenessReport } from './confidence';

/**
 * Contextual tactical analyzer evaluating 4-phase shapes, metrics,
 * explicit FM24 rules, Guide to Football trade-offs, and Passion4FM synergy patterns.
 */
export function analyzeTacticV2(
  slots: TacticSlot[],
  instructions: TeamInstructions,
  players?: Record<string, PlayerV2 | Player>
): TacticAnalysisV2 {
  const fatalErrors: string[] = [];
  const findings: TacticalFindingV2[] = [];

  // 1. Data Completeness & Confidence
  const completenessReport: DataCompletenessReport = calculateDataCompletenessReport(slots, players);

  // 2. Derive 4-Phase Shape & Metrics
  const phaseShape: PhaseShape = derive4PhaseShape(slots, instructions);
  const metrics: TacticalMetricsV2 = calculateTacticalMetricsV2(slots, instructions, phaseShape, players);

  // -------------------------------------------------------------
  // RULE EVALUATION: 1. FATAL CONSTRAINTS
  // -------------------------------------------------------------
  const gkSlots = slots.filter(s => s.position === 'GK');
  if (gkSlots.length === 0) {
    fatalErrors.push('Tim tidak memiliki Goalkeeper (GK). Minimal 1 GK wajib ada.');
    findings.push({
      id: 'fatal_no_gk',
      sourceMetadata: { ruleId: 'FM24_RULE_GK_REQUIRED', source: 'FM24_RULE' },
      phase: 'out_of_possession',
      severity: 'fatal_constraint',
      confidence: 100,
      title: 'Tidak Ada Kiper (GK)',
      description: 'Formasi tidak memiliki penjaga gawang. Tim tidak dapat didaftarkan di FM24 tanpa kiper.',
      affectedSlots: [],
      solutions: ['Tempatkan minimal 1 pemain pada posisi GK (Goalkeeper atau Sweeper Keeper).'],
    });
  }

  if (slots.length !== 11) {
    fatalErrors.push(`Jumlah pemain dalam starting XI adalah ${slots.length}, harus tepat 11.`);
    findings.push({
      id: 'fatal_slot_count',
      sourceMetadata: { ruleId: 'FM24_RULE_SQUAD_SIZE', source: 'FM24_RULE' },
      phase: 'general',
      severity: 'fatal_constraint',
      confidence: 100,
      title: 'Jumlah Pemain Tidak Sesuai Aturan',
      description: `Formasi berisi ${slots.length} pemain, regulasi pertandingan mengharuskan tepat 11 pemain di lapangan.`,
      affectedSlots: slots.map(s => s.slotId),
      solutions: ['Sesuaikan jumlah slot starting line-up menjadi tepat 11 pemain.'],
    });
  }

  // -------------------------------------------------------------
  // RULE EVALUATION: 2. STRUCTURAL WEAKNESSES
  // -------------------------------------------------------------
  // Critical weakness: No Rest Defence (e.g. restDefenceCount < 3)
  if (phaseShape.restDefenceCount < 3) {
    findings.push({
      id: 'weakness_depleted_rest_defence',
      sourceMetadata: { ruleId: 'GTF_REST_DEFENCE_MINIMUM', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'out_of_possession',
      severity: 'structural_weakness',
      confidence: 95,
      title: 'Struktur Rest-Defence Sangat Rentan',
      description: `Hanya ada ${phaseShape.restDefenceCount} pemain outfield yang siaga bertahan saat menyerang. Tim sangat mudah dieksploitasi serangan balik saat kehilangan bola.`,
      affectedSlots: slots.filter(s => ['DC', 'DR', 'DL', 'DM'].includes(s.position)).map(s => s.slotId),
      evidenceMetric: 'restDefenceCoverage',
      downside: 'Area pertahanan terbuka lebar begitu counter-press gagal.',
      solutions: [
        'Ubah satu fullback menjadi Inverted Full-Back (IFB) atau Full-Back (Defend).',
        'Gunakan minimal 1 gelandang bertahan dengan duty Defend (Anchor / DM-D / Half Back).',
      ],
      expectedMetricDelta: { restDefenceCoverage: 35, defensiveLineProtection: 20 },
    });
  }

  // Critical weakness: Abandoned flank width (both or one flank has < 30 width)
  const leftFlankSlots = slots.filter(s => ['DL', 'WBL', 'ML', 'AML'].includes(s.position)).map(s => s.slotId);
  const rightFlankSlots = slots.filter(s => ['DR', 'WBR', 'MR', 'AMR'].includes(s.position)).map(s => s.slotId);

  if (metrics.widthLeft < 30) {
    findings.push({
      id: 'weakness_no_width_left',
      sourceMetadata: { ruleId: 'P4FM_FLANK_BREADTH', source: 'PASSION_4_FM' },
      phase: 'in_possession',
      severity: 'structural_weakness',
      confidence: 90,
      title: 'Sisi Kiri Tidak Memiliki Lebar Lapangan (Width)',
      description: 'Tidak ada pemain di sayap kiri yang memegang garis tepi. Pertahanan lawan dapat menyempit dan memadati area tengah dengan mudah.',
      affectedSlots: leftFlankSlots,
      evidenceMetric: 'widthLeft',
      downside: 'Serangan menjadi monoton di tengah dan mudah dipatahkan.',
      solutions: [
        'Beri duty Attack pada Full-Back / Wing-Back kiri.',
        'Gunakan Winger (W) di posisi AML/ML daripada Inside Forward yang memotong ke dalam.',
      ],
      expectedMetricDelta: { widthLeft: 40 },
    });
  }

  if (metrics.widthRight < 30) {
    findings.push({
      id: 'weakness_no_width_right',
      sourceMetadata: { ruleId: 'P4FM_FLANK_BREADTH', source: 'PASSION_4_FM' },
      phase: 'in_possession',
      severity: 'structural_weakness',
      confidence: 90,
      title: 'Sisi Kanan Tidak Memiliki Lebar Lapangan (Width)',
      description: 'Tidak ada pemain di sayap kanan yang memegang garis tepi dalam fase menyerang.',
      affectedSlots: rightFlankSlots,
      evidenceMetric: 'widthRight',
      downside: 'Sirkulasi bola di sepertiga akhir pincang ke satu sisi.',
      solutions: [
        'Beri duty Attack pada Full-Back / Wing-Back kanan.',
        'Gunakan Winger (W) di posisi AMR/MR.',
      ],
      expectedMetricDelta: { widthRight: 40 },
    });
  }

  // Critical weakness: Vacated midfield
  const centralMids = slots.filter(s => ['MC', 'DM'].includes(s.position));
  if (centralMids.length === 0) {
    findings.push({
      id: 'weakness_vacated_midfield',
      sourceMetadata: { ruleId: 'GTF_MIDFIELD_ENGINE', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'general',
      severity: 'structural_weakness',
      confidence: 95,
      title: 'Lini Tengah Kosong Melompong',
      description: 'Formasi tidak memiliki pemain di posisi MC maupun DM, menciptakan lubang besar antara lini belakang dan lini depan.',
      affectedSlots: [],
      evidenceMetric: 'progressionAndPressResistance',
      downside: 'Lawan akan mendikte tempo dan mengalirkan bola tanpa rintangan.',
      solutions: ['Tempatkan minimal 2 pemain di posisi central midfield (MC atau DM).'],
      expectedMetricDelta: { progressionAndPressResistance: 40, defensiveLineProtection: 30 },
    });
  }

  // Critical weakness: Unscreened High Defensive Line
  if (instructions.defensiveLine === 'much_higher' && metrics.defensiveLineProtection < 40) {
    findings.push({
      id: 'weakness_unscreened_high_line',
      sourceMetadata: { ruleId: 'FM24_HIGH_LINE_EXPOSURE', source: 'FM24_RULE' },
      phase: 'out_of_possession',
      severity: 'structural_weakness',
      confidence: 92,
      title: 'Garis Pertahanan Sangat Tinggi Tanpa Pelindung',
      description: 'Defensive line disetel Much Higher tetapi tidak ada gelandang jangkar (DM/Anchor) yang menyaring serangan balik cepat lawan.',
      affectedSlots: slots.filter(s => s.position === 'DC').map(s => s.slotId),
      evidenceMetric: 'defensiveLineProtection',
      downside: 'Mudah ditembus through-ball dan umpan direct ke belakang bek.',
      solutions: [
        'Turunkan garis pertahanan ke Standard atau Higher.',
        'Pasang DM berprofil disiplin (Anchor atau DM Defend) di depan kedua bek tengah.',
        'Gunakan Sweeper Keeper (SK) untuk menyapu bola terobosan.',
      ],
      expectedMetricDelta: { defensiveLineProtection: 35 },
    });
  }

  // -------------------------------------------------------------
  // RULE EVALUATION: 3. CONDITIONAL RISKS
  // -------------------------------------------------------------
  // Stretched Block: High Press LOE + Lower/Much Lower Defensive Line
  if (
    instructions.lineOfEngagement === 'high_press' &&
    (instructions.defensiveLine === 'lower' || instructions.defensiveLine === 'much_lower')
  ) {
    findings.push({
      id: 'risk_stretched_block',
      sourceMetadata: { ruleId: 'GTF_COMPACTNESS_VERT', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'out_of_possession',
      severity: 'conditional_risk',
      confidence: 88,
      title: 'Blok Vertikal Terlalu Renggang (Stretched Block)',
      description: 'Lini serang menekan tinggi (High Press) namun lini pertahanan turun jauh (Lower D-Line). Ini menciptakan rongga luas di lini tengah.',
      affectedSlots: centralMids.map(s => s.slotId),
      evidenceMetric: 'blockCompactness',
      downside: 'Pemain tengah dipaksa mengkover area yang terlalu luas dan rentan dieksploitasi nomor 10 lawan.',
      solutions: [
        'Naikkan defensive line ke Standard / Higher agar tim tetap rapat (compact).',
        'Atau turunkan Line of Engagement ke Mid Block jika ingin mengamankan area belakang.',
      ],
      expectedMetricDelta: { blockCompactness: 40 },
    });
  }

  // High Stamina & Fatigue Risk
  if (metrics.physicalDemandFatigueRisk >= 85) {
    findings.push({
      id: 'risk_extreme_physical_burnout',
      sourceMetadata: { ruleId: 'P4FM_INTENSITY_FATIGUE', source: 'PASSION_4_FM' },
      phase: 'general',
      severity: 'conditional_risk',
      confidence: 85,
      title: 'Tingkat Intensitas & Risiko Kelelahan Sangat Tinggi',
      description: 'Kombinasi High Press, Trigger Press Much More Often, dan Tempo Tinggi akan menguras stamina skuad sebelum menit 70.',
      affectedSlots: slots.map(s => s.slotId),
      evidenceMetric: 'physicalDemandFatigueRisk',
      downside: 'Performa anjlok di akhir laga dan risiko cedera otot meningkat pesat.',
      solutions: [
        'Turunkan Trigger Press ke "More Often" atau "Standard".',
        'Gunakan taktik sekunder dengan tempo lebih rendah untuk mengelola keunggulan skor di babak kedua.',
      ],
      expectedMetricDelta: { physicalDemandFatigueRisk: -30 },
    });
  }

  // Playmaker Redundancy
  const deepPlaymakers = slots.filter(s => ['dlp', 'regista'].includes(s.roleId));
  if (deepPlaymakers.length >= 2) {
    findings.push({
      id: 'risk_playmaker_congestion',
      sourceMetadata: { ruleId: 'FM24_PLAYMAKER_OVERLAP', source: 'FM24_RULE' },
      phase: 'in_possession',
      severity: 'conditional_risk',
      confidence: 80,
      title: 'Distribusi Terbagi Antara Dua Playmaker Dalam',
      description: 'Dua pemain di lini dalam berperan sebagai deep playmaker (DLP / Regista), berpotensi menduplikasi sirkulasi bola dan mengurangi pergerakan dinamis tanpa bola.',
      affectedSlots: deepPlaymakers.map(s => s.slotId),
      evidenceMetric: 'buildUpOutletsAndTriangles',
      downside: 'Kekurangan pelari penembus lini dan perebut bola di lini tengah.',
      solutions: [
        'Ubah satu playmaker menjadi Ball-Winning Midfielder (BWM) atau Box-to-Box Midfielder (BBM).',
        'Pastikan salah satu playmaker berfokus pada Defend dan yang lain diberi kebebasan menjelajah.',
      ],
      expectedMetricDelta: { progressionAndPressResistance: 15 },
    });
  }

  // -------------------------------------------------------------
  // RULE EVALUATION: 4. TACTICAL TRADE-OFFS
  // -------------------------------------------------------------
  const attackingFullbacks = slots.filter(
    s => ['DR', 'DL', 'WBR', 'WBL'].includes(s.position) && s.duty === 'Attack'
  );
  if (attackingFullbacks.length >= 1) {
    findings.push({
      id: 'tradeoff_attacking_flanks',
      sourceMetadata: { ruleId: 'GTF_OVERLAP_RISK', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'transition',
      severity: 'trade_off',
      confidence: 85,
      title: 'Overload Sayap Menghasilkan Ruang Terbuka di Belakang',
      description: 'Full-back/Wing-back yang agresif naik menyerang memberikan keunggulan numerik di sayap lawan, namun meninggalkan ruang terbuka di area pertahanan sayap.',
      affectedSlots: attackingFullbacks.map(s => s.slotId),
      evidenceMetric: 'widthLeft',
      benefit: 'Menciptakan peluang umpan silang dan overload di sepertiga akhir.',
      downside: 'Rentan counter-attack lawan di ruang antara bek tengah dan tepi lapangan.',
      solutions: [
        'Gunakan bek tengah yang cepat atau bek kanan/kiri lawan yang bertipe Inverted Full-Back (IFB) untuk membentuk back 3 saat menyerang.',
      ],
      expectedMetricDelta: { restDefenceCoverage: 15 },
    });
  }

  if (instructions.playOutOfDefence) {
    findings.push({
      id: 'tradeoff_play_out_of_defence',
      sourceMetadata: { ruleId: 'GTF_BUILDUP_TRADEOFF', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'in_possession',
      severity: 'trade_off',
      confidence: 82,
      title: 'Membangun Serangan dari Belakang (Play Out of Defence)',
      description: 'Menginstruksikan tim untuk mengalirkan bola dengan umpan pendek dari lini belakang, memancing pressing lawan untuk membuka ruang di depan.',
      affectedSlots: slots.filter(s => ['GK', 'DC', 'DR', 'DL'].includes(s.position)).map(s => s.slotId),
      evidenceMetric: 'buildUpOutletsAndTriangles',
      benefit: 'Kontrol penguasaan bola superior dan sirkulasi bola yang terstruktur.',
      downside: 'Kekeliruan umpan dekat kotak penalti sendiri langsung berbuah peluang emas bagi lawan.',
      solutions: [
        'Pastikan bek tengah memiliki atribut Composure dan Passing minimal di atas rata-rata liga.',
      ],
      expectedMetricDelta: { progressionAndPressResistance: 10 },
    });
  }

  // -------------------------------------------------------------
  // RULE EVALUATION: 5. SYNERGIES
  // -------------------------------------------------------------
  // Synergistic combination: Inverted Winger/Forward + Overlapping Fullback
  const leftInsideAttacker = slots.some(s => s.position === 'AML' && ['inside_forward', 'inverted_winger'].includes(s.roleId));
  const leftOverlappingBack = slots.some(s => ['DL', 'WBL'].includes(s.position) && s.duty === 'Attack');
  if (leftInsideAttacker && leftOverlappingBack) {
    findings.push({
      id: 'synergy_left_flank_overlap',
      sourceMetadata: { ruleId: 'GTF_FLANK_DYNAMICS', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'in_possession',
      severity: 'synergy',
      confidence: 90,
      title: 'Sinergi Sayap Kiri: Potongan ke Dalam Didukung Overlap',
      description: 'Penyerang sayap memotong ke dalam menarik perhatian bek kanan lawan, sementara bek sayap kiri bebas overlap ke garis akhir.',
      affectedSlots: leftFlankSlots,
      evidenceMetric: 'widthLeft',
      benefit: 'Menciptakan dilema 2 lawan 1 bagi fullback lawan.',
      solutions: [],
      expectedMetricDelta: { boxOccupation: 10, widthLeft: 10 },
    });
  }

  const rightInsideAttacker = slots.some(s => s.position === 'AMR' && ['inside_forward', 'inverted_winger'].includes(s.roleId));
  const rightOverlappingBack = slots.some(s => ['DR', 'WBR'].includes(s.position) && s.duty === 'Attack');
  if (rightInsideAttacker && rightOverlappingBack) {
    findings.push({
      id: 'synergy_right_flank_overlap',
      sourceMetadata: { ruleId: 'GTF_FLANK_DYNAMICS', source: 'GUIDE_TO_FOOTBALL' },
      phase: 'in_possession',
      severity: 'synergy',
      confidence: 90,
      title: 'Sinergi Sayap Kanan: Potongan ke Dalam Didukung Overlap',
      description: 'Penyerang sayap kanan memotong ke dalam didukung pergerakan overlap bek sayap kanan.',
      affectedSlots: rightFlankSlots,
      evidenceMetric: 'widthRight',
      benefit: 'Membongkar pertahanan sisi kanan dengan rotasi posisi yang dinamis.',
      solutions: [],
      expectedMetricDelta: { boxOccupation: 10, widthRight: 10 },
    });
  }

  // Synergy: High Line + Sweeper Keeper
  const hasHighLine = instructions.defensiveLine === 'higher' || instructions.defensiveLine === 'much_higher';
  const hasSK = slots.some(s => s.position === 'GK' && s.roleId === 'sk');
  if (hasHighLine && hasSK) {
    findings.push({
      id: 'synergy_sweeper_high_line',
      sourceMetadata: { ruleId: 'FM24_SWEEPER_SWEEP', source: 'FM24_RULE' },
      phase: 'out_of_possession',
      severity: 'synergy',
      confidence: 88,
      title: 'Sinergi Garis Tinggi & Sweeper Keeper',
      description: 'Sweeper Keeper secara aktif keluar dari sarangnya untuk mengamankan bola terobosan di belakang garis pertahanan tinggi.',
      affectedSlots: slots.filter(s => s.position === 'GK').map(s => s.slotId),
      evidenceMetric: 'defensiveLineProtection',
      benefit: 'Mengurangi kerentanan serangan balik cepat di belakang bek tengah.',
      solutions: [],
      expectedMetricDelta: { defensiveLineProtection: 15 },
    });
  }

  // Synergy: 3+2 Rest Defence Structure
  if (phaseShape.restDefenceShape === '3+2') {
    findings.push({
      id: 'synergy_3_plus_2_rest_defence',
      sourceMetadata: { ruleId: 'P4FM_REST_DEFENCE_GOLD', source: 'PASSION_4_FM' },
      phase: 'transition',
      severity: 'synergy',
      confidence: 95,
      title: 'Struktur Rest-Defence Ideal (3+2)',
      description: 'Fondasi 3 bek dan 2 poros ganda (pivot) mengunci transisi bertahan, membebaskan 5 penyerang di depan untuk berkreasi.',
      affectedSlots: slots.filter(s => ['DC', 'DR', 'DL', 'DM'].includes(s.position)).map(s => s.slotId),
      evidenceMetric: 'restDefenceCoverage',
      benefit: 'Keseimbangan sempurna antara daya gedor serangan dan kekokohan proteksi serangan balik.',
      solutions: [],
      expectedMetricDelta: { restDefenceCoverage: 20 },
    });
  }

  // -------------------------------------------------------------
  // RULE EVALUATION: 6. OPTIMIZATIONS
  // -------------------------------------------------------------
  if (metrics.depthAndRunners < 40 && !instructions.passIntoSpace) {
    findings.push({
      id: 'opt_add_pass_into_space',
      sourceMetadata: { ruleId: 'FM24_SPACE_EXPLOIT', source: 'FM24_RULE' },
      phase: 'in_possession',
      severity: 'optimization',
      confidence: 75,
      title: 'Optimasi Umpan ke Ruang Kosong',
      description: 'Kecepatan lari dan kedalaman serang dapat lebih dioptimalkan jika pemain diinstruksikan mengalirkan bola langsung ke ruang lari (Pass Into Space).',
      affectedSlots: [],
      solutions: ['Aktifkan instruksi tim "Pass Into Space" untuk memanfaatkan kecepatan para penyerang.'],
      expectedMetricDelta: { depthAndRunners: 12 },
    });
  }

  // -------------------------------------------------------------
  // 7. COHESION CALCULATION & CAPPING GATES
  // -------------------------------------------------------------
  // Base cohesion calculated from core metrics and structural balance
  let rawCohesion =
    metrics.blockCompactness * 0.15 +
    metrics.restDefenceCoverage * 0.15 +
    metrics.defensiveLineProtection * 0.15 +
    metrics.progressionAndPressResistance * 0.15 +
    metrics.buildUpOutletsAndTriangles * 0.10 +
    ((metrics.widthLeft + metrics.widthRight) / 2) * 0.10 +
    metrics.boxOccupation * 0.10 +
    metrics.counterpressRegroupReadiness * 0.10;

  // Add synergy bonuses
  const synergyCount = findings.filter(f => f.severity === 'synergy').length;
  rawCohesion += synergyCount * 2.5;

  // Penalize for trade-offs & conditional risks
  const riskCount = findings.filter(f => f.severity === 'conditional_risk').length;
  rawCohesion -= riskCount * 3.5;

  let finalCohesion = Math.max(10, Math.min(100, Math.round(rawCohesion)));
  let cohesionGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  let hasCriticalDanger = false;

  const fatalCount = fatalErrors.length;
  const weaknessCount = findings.filter(f => f.severity === 'structural_weakness').length;
  const highConfidenceRisks = findings.filter(
    f => (f.severity === 'structural_weakness' || f.severity === 'conditional_risk') && f.confidence >= 85
  );

  if (highConfidenceRisks.length > 0 || weaknessCount > 0) {
    hasCriticalDanger = true;
  }

  // STRICT CAPPING RULES
  // 1. Fatal errors -> Maximum 30%, Grade F
  if (fatalCount > 0) {
    finalCohesion = Math.min(finalCohesion, 30);
    cohesionGrade = 'F';
  }
  // 2. Structural weaknesses or High Confidence Danger -> CANNOT BE GRADE S!
  else if (weaknessCount > 0 || hasCriticalDanger) {
    // Cap at 84% (Grade A max)
    finalCohesion = Math.min(finalCohesion, 84);
    if (weaknessCount >= 2) {
      finalCohesion = Math.min(finalCohesion, 74); // Grade B or lower
    }
    cohesionGrade = finalCohesion >= 80 ? 'A' : finalCohesion >= 70 ? 'B' : finalCohesion >= 55 ? 'C' : 'D';
  }
  // 3. Incomplete core data (< 60%) -> CANNOT BE GRADE S
  else if (completenessReport.completenessScore < 60) {
    finalCohesion = Math.min(finalCohesion, 84);
    cohesionGrade = finalCohesion >= 80 ? 'A' : 'B';
  }
  // 4. Missing critical phase functions -> CANNOT BE GRADE S
  else if (
    phaseShape.restDefenceCount < 3 ||
    metrics.boxOccupation < 25 ||
    metrics.buildUpOutletsAndTriangles < 25
  ) {
    finalCohesion = Math.min(finalCohesion, 84);
    cohesionGrade = finalCohesion >= 80 ? 'A' : 'B';
  }
  // 5. Standard grading without caps
  else {
    if (finalCohesion >= 90) cohesionGrade = 'S';
    else if (finalCohesion >= 80) cohesionGrade = 'A';
    else if (finalCohesion >= 70) cohesionGrade = 'B';
    else if (finalCohesion >= 55) cohesionGrade = 'C';
    else if (finalCohesion >= 40) cohesionGrade = 'D';
    else cohesionGrade = 'F';
  }

  return {
    schemaVersion: 2,
    tacticalCohesion: finalCohesion,
    cohesionGrade,
    dataConfidence: completenessReport.dataConfidence,
    dataCompleteness: completenessReport,
    phaseShape,
    metrics,
    findings,
    fatalErrors,
    hasCriticalDanger,
  };
}
