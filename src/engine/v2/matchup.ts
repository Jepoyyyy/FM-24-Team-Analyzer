import { Player, TacticSlot, TeamInstructions } from '../../types';
import { analyzeTacticV2 } from './analyzer';
import {
  MatchupAdjustmentV2,
  MatchupPhaseScoreV2,
  MatchupRootCauseV2,
  PlayerV2,
  SimulationSnapshotV2,
  TacticalMatchupV2,
} from './types';

export interface TacticalOpponentInput {
  id: string;
  name: string;
  keyThreats: string[];
  slots: TacticSlot[];
  instructions: TeamInstructions;
}

const clamp = (value: number, min = 5, max = 95) =>
  Math.max(min, Math.min(max, Math.round(value)));

function phaseVerdict(score: number): MatchupPhaseScoreV2['verdict'] {
  if (score >= 68) return 'strong';
  if (score >= 56) return 'stable';
  if (score >= 45) return 'contested';
  if (score >= 34) return 'fragile';
  return 'critical';
}

function describePhase(label: string, score: number, edge: string, threat: string): MatchupPhaseScoreV2 {
  const verdict = phaseVerdict(score);
  const summaries: Record<MatchupPhaseScoreV2['verdict'], string> = {
    strong: `${label} memberi keunggulan struktural yang jelas.`,
    stable: `${label} cukup stabil, meski tetap membutuhkan eksekusi pemain.`,
    contested: `${label} berimbang dan kemungkinan ditentukan detail eksekusi.`,
    fragile: `${label} rentan dieksploitasi oleh pola utama lawan.`,
    critical: `${label} adalah titik kegagalan paling mungkin pada matchup ini.`,
  };

  return { id: 'in_possession', label, score, verdict, summary: summaries[verdict], userEdge: edge, opponentThreat: threat };
}

function slotsByPosition(slots: TacticSlot[], positions: string[]) {
  return slots.filter(slot => positions.includes(slot.position));
}

/**
 * Deterministic phase-by-phase diagnosis. This is the source of tactical truth;
 * stochastic match outcomes consume it but never replace its explanation.
 */
export function analyzeTacticalMatchupV2(
  snapshot: SimulationSnapshotV2,
  opponent: TacticalOpponentInput,
  players: Record<string, PlayerV2 | Player>
): TacticalMatchupV2 {
  const userSlots = snapshot.slots as TacticSlot[];
  const user = analyzeTacticV2(userSlots, snapshot.teamInstructions, players);
  const opp = analyzeTacticV2(opponent.slots, opponent.instructions);
  const u = user.metrics;
  const o = opp.metrics;
  const userFinalThirdPlayers = user.phaseShape.playerCoords.filter(player => player.position !== 'GK' && player.inPossession.y <= 30).length;
  const opponentDefensiveDensity = opponent.slots.filter(slot =>
    slot.position === 'DC' ||
    (['DL', 'DR', 'WBL', 'WBR', 'DM', 'MC'].includes(slot.position) && slot.duty === 'Defend')
  ).length;
  const opponentTransitionRunners = opponent.slots.filter(slot =>
    slot.duty === 'Attack' && ['DL', 'DR', 'WBL', 'WBR', 'MC', 'AMC', 'AML', 'AMR', 'STC'].includes(slot.position)
  ).length + (opponent.instructions.whenWonPossession === 'counter' ? 1 : 0);
  const userTransitionRunners = userSlots.filter(slot =>
    slot.duty === 'Attack' && ['WBL', 'WBR', 'MC', 'AMC', 'AML', 'AMR', 'STC'].includes(slot.position)
  ).length + (snapshot.teamInstructions.whenWonPossession === 'counter' ? 1 : 0);

  const buildUpVsPress =
    50 +
    (u.buildUpOutletsAndTriangles - o.pressingAccessAndSupport) * 0.45 +
    (u.progressionAndPressResistance - o.blockCompactness) * 0.3;
  const settledAttack =
    50 +
    (((u.widthLeft + u.widthRight) / 2) - o.blockCompactness) * 0.15 +
    (u.centralHalfSpaceOccupation - o.defensiveLineProtection) * 0.2 +
    (u.depthAndRunners - o.restDefenceCoverage) * 0.2 +
    (u.boxOccupation - o.defensiveLineProtection) * 0.3;
  const finalThirdNumbersModifier = (userFinalThirdPlayers - opponentDefensiveDensity) * 3.5;
  const inPossessionScore = clamp(buildUpVsPress * 0.48 + settledAttack * 0.52 + finalThirdNumbersModifier);

  const defensiveTransitionScore = clamp(
    50 +
      (u.restDefenceCoverage - o.counterattackThreat) * 0.35 +
      (u.counterpressRegroupReadiness - o.progressionAndPressResistance) * 0.25 +
      (u.defensiveLineProtection - o.depthAndRunners) * 0.2 +
      (user.phaseShape.restDefenceCount - opponentTransitionRunners) * 4.5
  );

  const outOfPossessionScore = clamp(
    50 +
      (u.blockCompactness - o.centralHalfSpaceOccupation) * 0.3 +
      (u.pressingAccessAndSupport - o.buildUpOutletsAndTriangles) * 0.25 +
      (u.defensiveLineProtection - o.boxOccupation) * 0.25 +
      (u.aerialAttackDefence - o.aerialAttackDefence) * 0.1
  );

  const attackingTransitionScore = clamp(
    50 +
      (u.counterattackThreat - o.restDefenceCoverage) * 0.4 +
      (u.depthAndRunners - o.defensiveLineProtection) * 0.25 +
      (u.progressionAndPressResistance - o.counterpressRegroupReadiness) * 0.2 +
      (userTransitionRunners - opp.phaseShape.restDefenceCount) * 4
  );

  const phases: MatchupPhaseScoreV2[] = [
    { ...describePhase('Saat menguasai bola', inPossessionScore, `Build-up ${user.phaseShape.inPossessionShape} dan akses progresi bernilai ${Math.round(buildUpVsPress)}.`, `Pressing lawan bernilai ${o.pressingAccessAndSupport} dengan blok ${opp.phaseShape.settledDefenceShape}.`), id: 'in_possession' },
    { ...describePhase('Transisi bertahan', defensiveTransitionScore, `Rest defence ${user.phaseShape.restDefenceShape} menyediakan ${user.phaseShape.restDefenceCount} penjaga struktur.`, `Ancaman counter lawan bernilai ${o.counterattackThreat}.`), id: 'defensive_transition' },
    { ...describePhase('Tanpa bola', outOfPossessionScore, `Blok ${user.phaseShape.settledDefenceShape} memiliki compactness ${u.blockCompactness}.`, `Progresi lawan bernilai ${o.progressionAndPressResistance} dan okupasi kotak ${o.boxOccupation}.`), id: 'out_of_possession' },
    { ...describePhase('Transisi menyerang', attackingTransitionScore, `Ancaman counter dan pelari vertikal bernilai ${u.counterattackThreat}/${u.depthAndRunners}.`, `Rest defence lawan ${opp.phaseShape.restDefenceShape} bernilai ${o.restDefenceCoverage}.`), id: 'attacking_transition' },
  ];

  const rootCauses: MatchupRootCauseV2[] = [];
  const adjustments: MatchupAdjustmentV2[] = [];
  const addCause = (cause: MatchupRootCauseV2, adjustment?: MatchupAdjustmentV2) => {
    rootCauses.push(cause);
    if (adjustment) adjustments.push(adjustment);
  };

  const buildUpSlots = slotsByPosition(userSlots, ['GK', 'DC', 'DL', 'DR', 'DM']);
  if (buildUpVsPress < 45 && o.pressingAccessAndSupport >= 65) {
    addCause(
      {
        id: 'pressing-trap', phase: 'in_possession', severity: 'critical',
        title: 'Build-up terjebak pressing lawan',
        explanation: 'Jumlah outlet dan kemampuan progresi tidak cukup untuk melewati tekanan lini pertama lawan secara konsisten.',
        evidence: [`Build-up ${Math.round(buildUpVsPress)}/100`, `Press lawan ${o.pressingAccessAndSupport}/100`, `Shape ${user.phaseShape.inPossessionShape}`],
        affectedSlots: buildUpSlots.map(slot => slot.slotId),
      },
      {
        id: 'escape-press', phase: 'in_possession',
        action: 'Tambahkan outlet build-up: gunakan DM yang menjemput bola, ball-playing defender, atau distribusi lebih direct.',
        expectedBenefit: 'Mengurangi turnover di sepertiga sendiri dan memberi akses ke lini kedua.',
        tradeOff: 'Distribusi lebih direct menurunkan kontrol possession dan meningkatkan duel bola kedua.',
      }
    );
  }

  if (opponentDefensiveDensity >= userFinalThirdPlayers + 2) {
    addCause(
      {
        id: 'crowded-final-third', phase: 'in_possession', severity: 'warning',
        title: 'Lini akhir kalah jumlah terhadap blok lawan',
        explanation: 'Lawan dapat menutup kotak dengan lebih banyak penjaga daripada jumlah pemain yang konsisten tiba di lini akhir.',
        evidence: [`Pemain final third ${userFinalThirdPlayers}`, `Defensive density lawan ${opponentDefensiveDensity}`, `Box occupation ${u.boxOccupation}/100`],
        affectedSlots: user.phaseShape.playerCoords.filter(player => player.inPossession.y <= 30).map(player => player.slotId),
      },
      {
        id: 'move-low-block', phase: 'in_possession',
        action: 'Gerakkan blok sebelum menyerang kotak: tambah switch of play, satu late runner, atau overlap selektif.',
        expectedBenefit: 'Menciptakan isolasi dan membuka jalur cutback tanpa sekadar menambah jumlah penyerang statis.',
        tradeOff: 'Late runner dan overlap mengurangi perlindungan saat turnover jika dilepas bersamaan.',
      }
    );
  }

  if (u.restDefenceCoverage < 60 && o.counterattackThreat >= 60) {
    const exposed = userSlots.filter(slot => ['DC', 'DL', 'DR', 'DM'].includes(slot.position));
    addCause(
      {
        id: 'rest-defence-overload', phase: 'defensive_transition', severity: 'critical',
        title: 'Rest defence kalah terhadap jalur counter',
        explanation: 'Terlalu sedikit pemain menjaga struktur saat serangan berlangsung, sementara lawan mempunyai pelari dan distribusi vertikal yang kuat.',
        evidence: [`Rest defence ${user.phaseShape.restDefenceShape}`, `Coverage ${u.restDefenceCoverage}/100`, `Counter lawan ${o.counterattackThreat}/100`],
        affectedSlots: exposed.map(slot => slot.slotId),
      },
      {
        id: 'secure-rest-defence', phase: 'defensive_transition',
        action: 'Tahan satu fullback atau satu gelandang sebagai penjaga rest defence.',
        expectedBenefit: 'Menciptakan cover tambahan ketika counter-press pertama gagal.',
        tradeOff: 'Satu jalur overlap atau satu runner kotak akan berkurang.',
      }
    );
  }

  const averageWidth = (u.widthLeft + u.widthRight) / 2;
  if (averageWidth < 48 && o.blockCompactness >= 68) {
    addCause(
      {
        id: 'narrow-vs-compact', phase: 'in_possession', severity: 'warning',
        title: 'Serangan terlalu sempit untuk membongkar blok',
        explanation: 'Lawan dapat mempertahankan kepadatan sentral karena taktik tidak konsisten menahan lebar di kedua sisi.',
        evidence: [`Lebar kiri/kanan ${u.widthLeft}/${u.widthRight}`, `Compactness lawan ${o.blockCompactness}/100`],
        affectedSlots: slotsByPosition(userSlots, ['DL', 'DR', 'WBL', 'WBR', 'ML', 'MR', 'AML', 'AMR']).map(slot => slot.slotId),
      },
      {
        id: 'stretch-block', phase: 'in_possession',
        action: 'Pertahankan minimal satu pemberi lebar di setiap sisi atau fokuskan overload lalu switch ke sisi lemah.',
        expectedBenefit: 'Memaksa blok lawan melebar dan membuka half-space.',
        tradeOff: 'Lebar ekstra memperpanjang jarak counter-press setelah kehilangan bola.',
      }
    );
  }

  if (u.blockCompactness < 55 && o.centralHalfSpaceOccupation >= 60) {
    addCause(
      {
        id: 'stretched-block', phase: 'out_of_possession', severity: 'critical',
        title: 'Ruang antarlini terbuka',
        explanation: 'Jarak antara garis pressing dan garis pertahanan memberi akses bagi pemain lawan di ruang sentral dan half-space.',
        evidence: [`Compactness ${u.blockCompactness}/100`, `Okupasi sentral lawan ${o.centralHalfSpaceOccupation}/100`],
        affectedSlots: slotsByPosition(userSlots, ['DM', 'MC', 'AMC', 'DC']).map(slot => slot.slotId),
      },
      {
        id: 'compress-block', phase: 'out_of_possession',
        action: 'Dekatkan line of engagement dan defensive line agar blok bergerak sebagai satu unit.',
        expectedBenefit: 'Mengurangi ruang penerimaan bola di antara lini.',
        tradeOff: 'Garis yang lebih tinggi membuka ruang di belakang; blok lebih rendah mengurangi tekanan awal.',
      }
    );
  }

  if (attackingTransitionScore >= 65) {
    rootCauses.push({
      id: 'transition-edge', phase: 'attacking_transition', severity: 'positive',
      title: 'Jalur counter memberi keunggulan',
      explanation: 'Pelari vertikal user menyerang struktur pengaman lawan sebelum blok mereka kembali terbentuk.',
      evidence: [`Transition ${attackingTransitionScore}/100`, `Counter ${u.counterattackThreat}/100`, `Rest defence lawan ${o.restDefenceCoverage}/100`],
      affectedSlots: slotsByPosition(userSlots, ['AML', 'AMR', 'AMC', 'STC']).map(slot => slot.slotId),
    });
  }

  if (rootCauses.length === 0) {
    rootCauses.push({
      id: 'balanced-structures', phase: 'in_possession', severity: 'positive',
      title: 'Tidak ada mismatch struktural yang dominan',
      explanation: 'Pertarungan relatif seimbang; kualitas eksekusi pemain dan perubahan game state kemungkinan menjadi pembeda.',
      evidence: phases.map(phase => `${phase.label} ${phase.score}/100`),
      affectedSlots: [],
    });
  }

  const overallScore = clamp(
    inPossessionScore * 0.29 + defensiveTransitionScore * 0.27 + outOfPossessionScore * 0.25 + attackingTransitionScore * 0.19
  );
  const verdict: TacticalMatchupV2['verdict'] =
    overallScore >= 65 ? 'favourable' :
    overallScore >= 56 ? 'slight_edge' :
    overallScore >= 45 ? 'balanced' :
    overallScore >= 35 ? 'unfavourable' : 'severe_risk';
  const weakest = [...phases].sort((a, b) => a.score - b.score)[0];
  const headline = verdict === 'favourable'
    ? `Struktur taktik unggul terhadap ${opponent.name}`
    : verdict === 'slight_edge'
      ? `Ada keunggulan kecil, tetapi ${weakest.label.toLowerCase()} perlu dijaga`
      : verdict === 'balanced'
        ? `Matchup berimbang; ${weakest.label.toLowerCase()} menjadi pembeda`
        : verdict === 'unfavourable'
          ? `${weakest.label} membuat matchup ini tidak menguntungkan`
          : `${weakest.label} berisiko meruntuhkan struktur tim`;
  const knownPlayers = user.dataCompleteness.dataConfidence;
  const confidence = clamp(55 + knownPlayers * 0.35 + Math.min(10, Math.abs(overallScore - 50) * 0.4), 40, 92);

  return {
    overallScore,
    verdict,
    headline,
    confidence,
    phases,
    rootCauses: rootCauses.slice(0, 5),
    adjustments: adjustments.slice(0, 4),
  };
}
