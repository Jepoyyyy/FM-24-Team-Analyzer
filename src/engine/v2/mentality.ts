import { Mentality } from '../../types';

export const MENTALITY_SOURCE_REFERENCES = [
  {
    id: 'P4FM_PRESSING_MENTALITY',
    label: 'Passion4FM — Pressing in Football Manager',
    url: 'https://www.passion4fm.com/pressing-in-football-manager/',
    supports: 'Mentality directs pressing and affects creative freedom, passing directness, tempo, time wasting, and attacking width.',
  },
  {
    id: 'P4FM_TACTICAL_FAMILIARITY',
    label: 'Passion4FM — Tactical Familiarity',
    url: 'https://www.passion4fm.com/how-to-maximize-tactical-familiarity/',
    supports: 'Changing mentality alters effective tempo and width while explicit team instructions continue to tune them.',
  },
  {
    id: 'SI_MENTALITY_DECISIONS',
    label: 'Sports Interactive Community — Mentality and decisions',
    url: 'https://community.sports-interactive.com/forums/topic/239280-creative-freedom-%E2%80%93-how-it-works-explanation/',
    supports: 'Higher individual mentality increases forward, dribbling, and crossing decisions; lower mentality favours safer decisions.',
  },
  {
    id: 'GTF_PHASES_AND_RISK',
    label: 'Guide to Football — Football tactics explained',
    url: 'https://guidetofootball.com/tactics/football-tactics-explained/',
    supports: 'Tactical choices must be evaluated across in-possession, out-of-possession, and transition phases with explicit trade-offs.',
  },
] as const;

export interface MentalityModifiers {
  width: number;
  forwardRuns: number;
  boxCommitment: number;
  pressingUrgency: number;
  counterIntent: number;
  restDefence: number;
  fatigueRisk: number;
  lineHeightY: number;
  inPossessionY: number;
  possessionTurnoverProbability: number;
  chanceCreationProbability: number;
  possessionChainCount: number;
}

export interface MentalityEffectExplanation {
  key: keyof MentalityModifiers;
  label: string;
  delta: number;
  unit: 'points' | 'percentage_points' | 'pitch_y' | 'chains';
  reason: string;
  sourceIds: Array<(typeof MENTALITY_SOURCE_REFERENCES)[number]['id']>;
}

export interface MentalityProfile {
  mentality: Mentality;
  level: -3 | -2 | -1 | 0 | 1 | 2 | 3;
  baseline: 'risk_averse' | 'neutral' | 'proactive';
  modifiers: MentalityModifiers;
  effects: MentalityEffectExplanation[];
}

const LEVELS: Record<Mentality, MentalityProfile['level']> = {
  very_defensive: -3,
  defensive: -2,
  cautious: -1,
  balanced: 0,
  positive: 1,
  attacking: 2,
  very_attacking: 3,
};

/**
 * Single source of truth for mentality effects.
 *
 * Values are deliberately bounded modifiers, not instruction replacements:
 * roles/duties and explicit TIs remain the dominant inputs. Balanced is the
 * zero baseline, making every change explainable as a delta from neutral.
 */
export function getMentalityProfile(mentality: Mentality): MentalityProfile {
  const level = LEVELS[mentality];
  const modifiers: MentalityModifiers = {
    width: level * 2,
    forwardRuns: level * 6,
    boxCommitment: level * 5,
    pressingUrgency: level * 4,
    counterIntent: level * 4,
    restDefence: level * -5,
    fatigueRisk: level * 5,
    lineHeightY: level * -1.5,
    inPossessionY: level * -2,
    possessionTurnoverProbability: level * 0.008,
    chanceCreationProbability: level * 0.01,
    possessionChainCount: level,
  };

  const effects: MentalityEffectExplanation[] = [
    { key: 'width', label: 'Lebar efektif', delta: modifiers.width, unit: 'points', reason: 'Mentality menggeser baseline attacking width; instruksi width tetap menjadi kontrol utama.', sourceIds: ['P4FM_PRESSING_MENTALITY', 'P4FM_TACTICAL_FAMILIARITY'] },
    { key: 'forwardRuns', label: 'Pelari ke depan', delta: modifiers.forwardRuns, unit: 'points', reason: 'Mentality lebih tinggi memberi izin lebih besar untuk meninggalkan posisi dan mengambil keputusan progresif.', sourceIds: ['SI_MENTALITY_DECISIONS'] },
    { key: 'boxCommitment', label: 'Komitmen ke kotak', delta: modifiers.boxCommitment, unit: 'points', reason: 'Kenaikan risk appetite membuat lebih banyak support runner menyerang area penyelesaian.', sourceIds: ['SI_MENTALITY_DECISIONS', 'GTF_PHASES_AND_RISK'] },
    { key: 'pressingUrgency', label: 'Urgensi pressing', delta: modifiers.pressingUrgency, unit: 'points', reason: 'Mentality menjadi baseline intensitas keputusan menekan; pressing TI masih menentukan trigger utamanya.', sourceIds: ['P4FM_PRESSING_MENTALITY'] },
    { key: 'counterIntent', label: 'Niat transisi menyerang', delta: modifiers.counterIntent, unit: 'points', reason: 'Risk appetite mengubah seberapa cepat pemain mencari progresi setelah regain.', sourceIds: ['SI_MENTALITY_DECISIONS', 'GTF_PHASES_AND_RISK'] },
    { key: 'restDefence', label: 'Keamanan rest-defence', delta: modifiers.restDefence, unit: 'points', reason: 'Komitmen pemain ke depan mempunyai trade-off langsung terhadap jumlah cover saat kehilangan bola.', sourceIds: ['GTF_PHASES_AND_RISK'] },
    { key: 'fatigueRisk', label: 'Beban fisik', delta: modifiers.fatigueRisk, unit: 'points', reason: 'Urgensi, pergerakan, dan pressing yang lebih agresif meningkatkan beban aksi berulang.', sourceIds: ['P4FM_PRESSING_MENTALITY'] },
    { key: 'lineHeightY', label: 'Ketinggian blok', delta: modifiers.lineHeightY, unit: 'pitch_y', reason: 'Mentality memberi bias kecil pada line height; Defensive Line dan Line of Engagement tetap dominan.', sourceIds: ['P4FM_PRESSING_MENTALITY'] },
    { key: 'possessionTurnoverProbability', label: 'Risiko kehilangan bola', delta: modifiers.possessionTurnoverProbability * 100, unit: 'percentage_points', reason: 'Keputusan yang lebih progresif dan cepat meningkatkan kemungkinan possession berakhir.', sourceIds: ['SI_MENTALITY_DECISIONS'] },
    { key: 'chanceCreationProbability', label: 'Urgensi mencipta peluang', delta: modifiers.chanceCreationProbability * 100, unit: 'percentage_points', reason: 'Risk appetite yang lebih tinggi mempercepat upaya mengubah progression menjadi box entry atau tembakan.', sourceIds: ['SI_MENTALITY_DECISIONS'] },
  ];

  return {
    mentality,
    level,
    baseline: level < 0 ? 'risk_averse' : level > 0 ? 'proactive' : 'neutral',
    modifiers,
    effects,
  };
}
