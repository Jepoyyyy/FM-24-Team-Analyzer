import { Player, Position, PositionalFamiliarity } from '../types';

export function parseFMHtml(htmlContent: string): Player[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const table = doc.querySelector('table');

  if (!table) {
    throw new Error('Tidak ditemukan tabel data pemain pada file HTML ini.');
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) {
    throw new Error('Tabel tidak memiliki baris data pemain yang cukup.');
  }

  const headerRow = rows[0];
  const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell =>
    cell.textContent?.trim().toLowerCase() || ''
  );

  const players: Player[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td')).map(c => c.textContent?.trim() || '');
    if (cells.length < headers.length) continue;

    const rowData: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowData[h] = cells[idx] || '';
    });

    const name = rowData['name'] || rowData['nama'] || `Player ${i}`;
    const age = parseInt(rowData['age'] || rowData['umur'] || '24', 10);
    const posStr = rowData['position'] || rowData['pos'] || rowData['posisi'] || 'MC';

    // Parse positions
    const positions = parsePositions(posStr);

    // Parse attributes
    const attributes: Record<string, number> = {};

    const attrMap: Record<string, string> = {
      'acc': 'acceleration',
      'acceleration': 'acceleration',
      'agi': 'agility',
      'agility': 'agility',
      'bal': 'balance',
      'balance': 'balance',
      'jum': 'jumpingReach',
      'jumping reach': 'jumpingReach',
      'pac': 'pace',
      'pace': 'pace',
      'sta': 'stamina',
      'stamina': 'stamina',
      'str': 'strength',
      'strength': 'strength',
      'nat': 'naturalFitness',
      'natural fitness': 'naturalFitness',

      'ant': 'anticipation',
      'anticipation': 'anticipation',
      'agg': 'aggression',
      'aggression': 'aggression',
      'bra': 'bravery',
      'bravery': 'bravery',
      'cmp': 'composure',
      'composure': 'composure',
      'cnt': 'concentration',
      'concentration': 'concentration',
      'dec': 'decisions',
      'decisions': 'decisions',
      'det': 'determination',
      'determination': 'determination',
      'fla': 'flair',
      'flair': 'flair',
      'ldr': 'leadership',
      'leadership': 'leadership',
      'otb': 'offTheBall',
      'off the ball': 'offTheBall',
      'pos': 'positioning',
      'positioning': 'positioning',
      'tea': 'teamwork',
      'teamwork': 'teamwork',
      'vis': 'vision',
      'vision': 'vision',
      'wor': 'workRate',
      'work rate': 'workRate',

      'cor': 'corners',
      'cro': 'crossing',
      'crossing': 'crossing',
      'dri': 'dribbling',
      'dribbling': 'dribbling',
      'fin': 'finishing',
      'finishing': 'finishing',
      'fir': 'firstTouch',
      'first touch': 'firstTouch',
      'fre': 'freeKicks',
      'hea': 'heading',
      'heading': 'heading',
      'lon': 'longShots',
      'long shots': 'longShots',
      'lth': 'longThrows',
      'mar': 'marking',
      'marking': 'marking',
      'pas': 'passing',
      'passing': 'passing',
      'pen': 'penaltyTaking',
      'tck': 'tackling',
      'tackling': 'tackling',
      'tec': 'technique',
      'technique': 'technique',

      'aer': 'aerialReach',
      'aerial reach': 'aerialReach',
      'cmd': 'commandOfArea',
      'com': 'communication',
      'ecc': 'eccentricity',
      'han': 'handling',
      'handling': 'handling',
      'kic': 'kicking',
      'kicking': 'kicking',
      'one': 'oneOnOnes',
      'one on ones': 'oneOnOnes',
      'pun': 'punching',
      'ref': 'reflexes',
      'reflexes': 'reflexes',
      'rus': 'rushingOut',
      'rushing out': 'rushingOut',
      'thr': 'throwing',
      'throwing': 'throwing',
    };

    for (const [key, val] of Object.entries(rowData)) {
      const normalizedKey = attrMap[key.toLowerCase()];
      if (normalizedKey) {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          attributes[normalizedKey] = Math.min(20, Math.max(1, num));
        }
      }
    }

    players.push({
      id: `imported_${i}_${Date.now()}`,
      name,
      age: isNaN(age) ? 24 : age,
      positions,
      attributes,
    });
  }

  return players;
}

function parsePositions(posString: string): { position: Position; familiarity: PositionalFamiliarity }[] {
  const result: { position: Position; familiarity: PositionalFamiliarity }[] = [];
  const s = posString.toUpperCase();

  const posCheck: { pattern: RegExp; pos: Position }[] = [
    { pattern: /\bGK\b/, pos: 'GK' },
    { pattern: /\bD\s*\(?.*R.*\)?/, pos: 'DR' },
    { pattern: /\bD\s*\(?.*L.*\)?/, pos: 'DL' },
    { pattern: /\bD\s*\(?.*C.*\)?/, pos: 'DC' },
    { pattern: /\bWB\s*\(?.*R.*\)?/, pos: 'WBR' },
    { pattern: /\bWB\s*\(?.*L.*\)?/, pos: 'WBL' },
    { pattern: /\bDM\b/, pos: 'DM' },
    { pattern: /\bM\s*\(?.*C.*\)?/, pos: 'MC' },
    { pattern: /\bM\s*\(?.*R.*\)?/, pos: 'MR' },
    { pattern: /\bM\s*\(?.*L.*\)?/, pos: 'ML' },
    { pattern: /\bAM\s*\(?.*C.*\)?/, pos: 'AMC' },
    { pattern: /\bAM\s*\(?.*R.*\)?/, pos: 'AMR' },
    { pattern: /\bAM\s*\(?.*L.*\)?/, pos: 'AML' },
    { pattern: /\bST\s*\(?.*C.*\)?|\bST\b|\bCF\b/, pos: 'STC' },
  ];

  for (const { pattern, pos } of posCheck) {
    if (pattern.test(s)) {
      result.push({ position: pos, familiarity: 'Natural' });
    }
  }

  if (result.length === 0) {
    result.push({ position: 'MC', familiarity: 'Natural' });
  }

  return result;
}
