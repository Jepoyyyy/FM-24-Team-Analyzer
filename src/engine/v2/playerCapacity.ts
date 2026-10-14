import { Player, Position } from '../../types';

export type TacticalFunctionId =
  | 'overlap_arrival'
  | 'cross_delivery'
  | 'cutback_delivery'
  | 'recovery_run'
  | 'rest_defence_cover';

export type CapacityBand = 'unknown' | 'basic' | 'competent' | 'strong' | 'elite';

interface AttributeWeight {
  attribute: string;
  weight: number;
}

interface ComponentDefinition {
  id: string;
  label: string;
  weight: number;
  attributes: AttributeWeight[];
}

interface FunctionDefinition {
  id: TacticalFunctionId;
  label: string;
  shortLabel: string;
  phase: string;
  purpose: string;
  components: ComponentDefinition[];
}

export interface CapacityComponentResult {
  id: string;
  label: string;
  score: number | null;
  confidence: number;
  knownAttributes: Array<{ attribute: string; value: number; weight: number }>;
  missingAttributes: string[];
}

export interface PlayerCapacityResult {
  functionId: TacticalFunctionId;
  label: string;
  shortLabel: string;
  phase: string;
  purpose: string;
  capacity: number | null;
  band: CapacityBand;
  dataConfidence: number;
  modelConfidence: number;
  components: CapacityComponentResult[];
  strengths: string[];
  limitations: string[];
  missingInputs: string[];
}

export interface PlayerCapacityProfile {
  playerId: string;
  position: Position | null;
  positionalAvailability: number;
  positionalFamiliarity: string;
  functions: PlayerCapacityResult[];
  strongestFunction: PlayerCapacityResult | null;
  bottleneck: PlayerCapacityResult | null;
}

export const PLAYER_CAPACITY_MODEL_VERSION = 'capacity-hypothesis-0.1.0';

const DEFINITIONS: FunctionDefinition[] = [
  {
    id: 'overlap_arrival',
    label: 'Overlap arrival',
    shortLabel: 'Overlap',
    phase: 'Progression / final third',
    purpose: 'Kemampuan tiba di sisi luar pada waktu dan intensitas yang tepat.',
    components: [
      { id: 'access', label: 'Akses ruang', weight: 0.35, attributes: [{ attribute: 'acceleration', weight: 0.55 }, { attribute: 'pace', weight: 0.45 }] },
      { id: 'perception', label: 'Timing & keputusan', weight: 0.40, attributes: [{ attribute: 'offTheBall', weight: 0.45 }, { attribute: 'anticipation', weight: 0.20 }, { attribute: 'decisions', weight: 0.35 }] },
      { id: 'repeatability', label: 'Daya ulang', weight: 0.25, attributes: [{ attribute: 'stamina', weight: 0.55 }, { attribute: 'workRate', weight: 0.45 }] },
    ],
  },
  {
    id: 'cross_delivery',
    label: 'Cross delivery',
    shortLabel: 'Cross',
    phase: 'Final action',
    purpose: 'Kualitas teknik dan keputusan saat mengirim crossing.',
    components: [
      { id: 'execution', label: 'Eksekusi', weight: 0.55, attributes: [{ attribute: 'crossing', weight: 0.60 }, { attribute: 'technique', weight: 0.25 }, { attribute: 'firstTouch', weight: 0.15 }] },
      { id: 'perception', label: 'Pemilihan umpan', weight: 0.35, attributes: [{ attribute: 'decisions', weight: 0.50 }, { attribute: 'vision', weight: 0.30 }, { attribute: 'anticipation', weight: 0.20 }] },
      { id: 'security', label: 'Stabilitas aksi', weight: 0.10, attributes: [{ attribute: 'composure', weight: 0.60 }, { attribute: 'balance', weight: 0.40 }] },
    ],
  },
  {
    id: 'cutback_delivery',
    label: 'Cutback delivery',
    shortLabel: 'Cutback',
    phase: 'Final action',
    purpose: 'Mencapai area dalam dan memilih umpan tarik yang tepat.',
    components: [
      { id: 'execution', label: 'Eksekusi', weight: 0.40, attributes: [{ attribute: 'passing', weight: 0.35 }, { attribute: 'crossing', weight: 0.30 }, { attribute: 'technique', weight: 0.20 }, { attribute: 'firstTouch', weight: 0.15 }] },
      { id: 'perception', label: 'Pembacaan target', weight: 0.35, attributes: [{ attribute: 'decisions', weight: 0.45 }, { attribute: 'vision', weight: 0.30 }, { attribute: 'teamwork', weight: 0.25 }] },
      { id: 'access', label: 'Akses byline', weight: 0.25, attributes: [{ attribute: 'acceleration', weight: 0.35 }, { attribute: 'dribbling', weight: 0.40 }, { attribute: 'agility', weight: 0.25 }] },
    ],
  },
  {
    id: 'recovery_run',
    label: 'Recovery run',
    shortLabel: 'Recovery',
    phase: 'Defensive transition',
    purpose: 'Kemampuan kembali melindungi ruang setelah possession hilang.',
    components: [
      { id: 'access', label: 'Kecepatan pulih', weight: 0.40, attributes: [{ attribute: 'acceleration', weight: 0.45 }, { attribute: 'pace', weight: 0.40 }, { attribute: 'agility', weight: 0.15 }] },
      { id: 'perception', label: 'Pembacaan bahaya', weight: 0.35, attributes: [{ attribute: 'anticipation', weight: 0.35 }, { attribute: 'positioning', weight: 0.40 }, { attribute: 'decisions', weight: 0.25 }] },
      { id: 'repeatability', label: 'Daya ulang', weight: 0.25, attributes: [{ attribute: 'stamina', weight: 0.50 }, { attribute: 'workRate', weight: 0.50 }] },
    ],
  },
  {
    id: 'rest_defence_cover',
    label: 'Rest-defence cover',
    shortLabel: 'Cover',
    phase: 'Possession / defensive transition',
    purpose: 'Kemampuan menjaga ruang dan lawan ketika pemain lain maju.',
    components: [
      { id: 'perception', label: 'Posisi & antisipasi', weight: 0.45, attributes: [{ attribute: 'positioning', weight: 0.35 }, { attribute: 'anticipation', weight: 0.25 }, { attribute: 'decisions', weight: 0.20 }, { attribute: 'concentration', weight: 0.20 }] },
      { id: 'duel', label: 'Eksekusi duel', weight: 0.35, attributes: [{ attribute: 'tackling', weight: 0.40 }, { attribute: 'marking', weight: 0.35 }, { attribute: 'strength', weight: 0.25 }] },
      { id: 'access', label: 'Akses ruang', weight: 0.20, attributes: [{ attribute: 'acceleration', weight: 0.55 }, { attribute: 'pace', weight: 0.45 }] },
    ],
  },
];

const ATTRIBUTE_LABELS: Record<string, string> = {
  acceleration: 'Acceleration', pace: 'Pace', offTheBall: 'Off the Ball', anticipation: 'Anticipation',
  decisions: 'Decisions', stamina: 'Stamina', workRate: 'Work Rate', crossing: 'Crossing',
  technique: 'Technique', firstTouch: 'First Touch', vision: 'Vision', composure: 'Composure',
  balance: 'Balance', passing: 'Passing', teamwork: 'Teamwork', dribbling: 'Dribbling',
  agility: 'Agility', positioning: 'Positioning', concentration: 'Concentration', tackling: 'Tackling',
  marking: 'Marking', strength: 'Strength',
};

function attributeValue(player: Player, attribute: string): number | undefined {
  const direct = player.attributes[attribute];
  if (typeof direct === 'number') return direct;
  const match = Object.entries(player.attributes).find(([key, value]) => key.toLowerCase() === attribute.toLowerCase() && typeof value === 'number');
  return match?.[1];
}

function normalize(value: number): number {
  return Math.max(0, Math.min(100, ((value - 1) / 19) * 100));
}

function bandFor(capacity: number | null): CapacityBand {
  if (capacity === null) return 'unknown';
  if (capacity >= 85) return 'elite';
  if (capacity >= 70) return 'strong';
  if (capacity >= 55) return 'competent';
  return 'basic';
}

function geometricMean(values: Array<{ score: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
  if (!values.length || totalWeight === 0) return 0;
  const logMean = values.reduce((sum, value) => sum + value.weight * Math.log(Math.max(1, value.score)), 0) / totalWeight;
  return Math.exp(logMean);
}

function calculateFunction(player: Player, definition: FunctionDefinition): PlayerCapacityResult {
  const components: CapacityComponentResult[] = definition.components.map(component => {
    const knownAttributes = component.attributes.flatMap(item => {
      const value = attributeValue(player, item.attribute);
      return value === undefined ? [] : [{ attribute: item.attribute, value, weight: item.weight }];
    });
    const missingAttributes = component.attributes
      .filter(item => attributeValue(player, item.attribute) === undefined)
      .map(item => item.attribute);
    const knownWeight = knownAttributes.reduce((sum, item) => sum + item.weight, 0);
    const score = knownWeight === 0
      ? null
      : knownAttributes.reduce((sum, item) => sum + normalize(item.value) * item.weight, 0) / knownWeight;

    return {
      id: component.id,
      label: component.label,
      score: score === null ? null : Math.round(score),
      confidence: Math.round(knownWeight * 100),
      knownAttributes,
      missingAttributes,
    };
  });

  const scorable = components.flatMap((component, index) => component.score === null
    ? []
    : [{ score: component.score, weight: definition.components[index].weight }]);
  const knownComponentWeight = scorable.reduce((sum, component) => sum + component.weight, 0);
  const capacity = knownComponentWeight < 0.6 ? null : Math.round(geometricMean(scorable));
  const dataConfidence = Math.round(definition.components.reduce((sum, component, index) => {
    return sum + component.weight * components[index].confidence;
  }, 0));

  const allKnown = components.flatMap(component => component.knownAttributes);
  const strengths = [...allKnown]
    .filter(item => item.value >= 15)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(item => `${ATTRIBUTE_LABELS[item.attribute] ?? item.attribute} ${item.value}`);
  const limitations = [...allKnown]
    .filter(item => item.value <= 10)
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map(item => `${ATTRIBUTE_LABELS[item.attribute] ?? item.attribute} ${item.value}`);
  const missingInputs = Array.from(new Set(components.flatMap(component => component.missingAttributes)));

  return {
    functionId: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    phase: definition.phase,
    purpose: definition.purpose,
    capacity,
    band: bandFor(capacity),
    dataConfidence,
    modelConfidence: 65,
    components,
    strengths,
    limitations,
    missingInputs,
  };
}

function availabilityFor(player: Player, position: Position | null): { score: number; familiarity: string } {
  if (!position) return { score: 0, familiarity: 'Unknown' };
  const entry = player.positions.find(item => item.position === position);
  if (!entry) return { score: 40, familiarity: 'Awkward' };
  const scores: Record<string, number> = { Natural: 100, Accomplished: 85, Unconvincing: 65, Awkward: 40 };
  return { score: scores[entry.familiarity] ?? 40, familiarity: entry.familiarity };
}

export function calculatePlayerCapacityProfile(player: Player, position: Position | null): PlayerCapacityProfile {
  const functions = DEFINITIONS.map(definition => calculateFunction(player, definition));
  const scorable = functions.filter(result => result.capacity !== null);
  const sorted = [...scorable].sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));
  const availability = availabilityFor(player, position);
  return {
    playerId: player.id,
    position,
    positionalAvailability: availability.score,
    positionalFamiliarity: availability.familiarity,
    functions,
    strongestFunction: sorted[0] ?? null,
    bottleneck: sorted.at(-1) ?? null,
  };
}

export function getCapacityBandLabel(band: CapacityBand): string {
  return ({ unknown: 'Data belum cukup', basic: 'Basic', competent: 'Competent', strong: 'Strong', elite: 'Elite' })[band];
}
