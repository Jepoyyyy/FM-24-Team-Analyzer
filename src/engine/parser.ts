import { ImportDiagnostic, ImportDraft, ImportedIdentity, Player, PlayerPerformanceData, Position, PositionalFamiliarity } from '../types';
import { hashStringDeterministic } from './v2/snapshot';

type OrderedRow = { rowNumber: number; cells: string[] };
type OrderedTable = { headers: string[]; rows: OrderedRow[] };

const ATTRIBUTE_GROUPS: Record<string, string[]> = {
  acceleration: ['acc', 'acceleration'], agility: ['agi', 'agility'], balance: ['bal', 'balance'], jumpingReach: ['jum', 'jumping reach'], pace: ['pac', 'pace'], stamina: ['sta', 'stamina'], strength: ['str', 'strength'], naturalFitness: ['nat', 'natural fitness'], anticipation: ['ant', 'anticipation'], aggression: ['agg', 'aggression'], bravery: ['bra', 'bravery'], composure: ['cmp', 'composure'], concentration: ['cnt', 'concentration'], decisions: ['dec', 'decisions'], determination: ['det', 'determination'], flair: ['fla', 'flair'], leadership: ['ldr', 'leadership'], offTheBall: ['otb', 'off the ball'], positioning: ['pos', 'positioning'], teamwork: ['tea', 'teamwork'], vision: ['vis', 'vision'], workRate: ['wor', 'work rate'], corners: ['cor', 'corners'], crossing: ['cro', 'crossing'], dribbling: ['dri', 'dribbling'], finishing: ['fin', 'finishing'], firstTouch: ['fir', 'first touch'], freeKicks: ['fre', 'free kicks'], heading: ['hea', 'heading'], longShots: ['lon', 'long shots'], longThrows: ['l th', 'lth', 'long throws'], marking: ['mar', 'marking'], passing: ['pas', 'passing'], penaltyTaking: ['pen', 'penalties'], tackling: ['tck', 'tackling'], technique: ['tec', 'technique'], aerialReach: ['aer', 'aerial reach'], commandOfArea: ['cmd', 'command of area'], communication: ['com', 'communication'], eccentricity: ['ecc', 'eccentricity'], handling: ['han', 'handling'], kicking: ['kic', 'kicking'], oneOnOnes: ['one', 'one on ones', '1v1'], punching: ['pun', 'punching'], reflexes: ['ref', 'reflexes'], rushingOut: ['tro', 'rus', 'rushing out'], throwing: ['thr', 'throwing'],
};
const ATTRIBUTE_ALIASES = Object.fromEntries(Object.entries(ATTRIBUTE_GROUPS).flatMap(([key, aliases]) => aliases.map(alias => [alias, key])));
const PERFORMANCE_GROUPS: Record<string, string[]> = {
  minutes: ['mins', 'minutes', 'minutes played', 'min'], appearances: ['apps', 'appearances', 'app'], starts: ['starts', 'start'], subAppearances: ['subs', 'sub appearances', 'apps as sub'], averageRating: ['av rat', 'avg rating', 'average rating', 'rating'], goals: ['gls', 'goals'], assists: ['ast', 'asts', 'assists'], xg: ['xg'], npxg: ['non-penalty xg', 'npxg', 'xg-op'], xA: ['xa'], shotsOnTargetPct: ['shots on target ratio', 'shots on target %', 'shot on target %', 'shot %'], shotsP90: ['shots/90', 'shot/90', 'shots per 90'], goalsP90: ['goals/90', 'gls/90'], assistsP90: ['assists/90', 'asts/90'], xgP90: ['xg/90'], xAP90: ['xa/90'], keyPassesP90: ['key passes/90', 'op-kp/90'], chancesCreatedP90: ['chances created/90', 'ch c/90'], passCompletionPct: ['pass completion ratio', 'pass completion %', 'passes completed %', 'pas %'], progressivePassesP90: ['progressive passes/90', 'pr passes/90'], dribblesP90: ['dribbles/90', 'drb/90'], progressiveCarriesP90: ['progressive carries/90'], crossesCompletedP90: ['crosses completed/90', 'cr c/90'], crossCompletionPct: ['cross completion %', 'op-cr %', 'cr c/a'], tackleWinPct: ['tackles won ratio', 'tackles won %', 'tck r'], tacklesP90: ['tackles/90', 'tck/90'], interceptionsP90: ['interceptions/90', 'int/90'], clearancesP90: ['clearances/90', 'clr/90'], aerialWinPct: ['headers won ratio', 'headers won %', 'hdr %'], possessionWonP90: ['poss won/90'], possessionLostP90: ['poss lost/90'], pressuresP90: ['pressures attempted/90', 'pres a/90'], pressuresCompletedP90: ['pressures completed/90', 'pres c/90'], pressureSuccessPct: ['pressure success %', 'pres c/a'], distanceP90: ['distance/90', 'dist/90'], sprintsP90: ['sprints/90'], savesP90: ['saves/90', 'svt'], savePct: ['save ratio', 'save %', 'sv %'], expectedSavePct: ['expected save %', 'xsv %'], goalsConcededP90: ['goals conceded/90', 'conc'], cleanSheets: ['clean sheets', 'shutouts'], goalsPrevented: ['expected goals prevented', 'xgp', 'xgp/90'], crossesStoppedPct: ['crosses stopped %'], passesAttemptedP90: ['passes attempted/90', 'ps a/90'], mistakes: ['mistakes', 'gl mst'],
};
export const PERFORMANCE_HEADER_ALIASES = Object.fromEntries(Object.entries(PERFORMANCE_GROUPS).flatMap(([key, aliases]) => aliases.map(alias => [alias, key])));
const normalize = (value: string) => value.toLowerCase().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
export const normalizeImportName = (value: string) => normalize(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
function numeric(value: string): number | null { const clean = value.trim().replace(/\u00a0/g, '').replace(/%|km$/gi, '').replace(/,/g, ''); if (!clean || /^[-–—]$/.test(clean)) return null; const parsed = Number.parseFloat(clean); return Number.isFinite(parsed) ? parsed : null; }
export function safeRatio(numerator: number | null, denominator: number | null): number | null { return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator; }
function readTable(html: string): OrderedTable { const doc = new DOMParser().parseFromString(html, 'text/html'); const table = [...doc.querySelectorAll('table')].sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length)[0]; if (!table) throw new Error('Tidak ditemukan tabel data pemain pada file HTML ini.'); const rows = [...table.querySelectorAll('tr')]; if (rows.length < 2) throw new Error('Tabel tidak memiliki baris data pemain yang cukup.'); return { headers: [...rows[0].querySelectorAll('th, td')].map(cell => normalize(cell.textContent ?? '')), rows: rows.slice(1).map((row, index) => ({ rowNumber: index + 2, cells: [...row.querySelectorAll('td')].map(cell => cell.textContent?.trim() ?? '') })).filter(row => row.cells.length > 0) }; }
function indices(headers: string[], aliases: string[]): number[] { return headers.map((header, index) => aliases.includes(header) ? index : -1).filter(index => index >= 0); }
function first(row: OrderedRow, headers: string[], aliases: string[], occurrence = 0): string { const index = indices(headers, aliases)[occurrence]; return index === undefined ? '' : row.cells[index] ?? ''; }
function duplicateHeaderOccurrences(headers: string[], view: 'attribute' | 'performance', diagnostics: ImportDiagnostic[]) {
  const counts = new Map<string, number>(); headers.forEach(header => counts.set(header, (counts.get(header) ?? 0) + 1));
  return [...counts.entries()].flatMap(([header, occurrences]) => {
    if (occurrences < 2) return [];
    diagnostics.push({ code: 'duplicate_header_occurrence', severity: 'warning', message: `${view === 'attribute' ? 'Attribute' : 'Performance'} View repeats “${header}” ${occurrences} times; values are mapped by column occurrence.`, identity: header });
    return [{ view, header, occurrences }];
  });
}
function headerCoverage(headers: string[], aliases: Record<string, string>, identityHeaders: string[]): Record<string, 'mapped' | 'identity' | 'unmapped'> {
  return Object.fromEntries(headers.map((header, index) => [`${header}#${index + 1}`, identityHeaders.includes(header) ? 'identity' : aliases[header] ? 'mapped' : 'unmapped']));
}

export interface ParsedAttributeView { headers: string[]; players: Player[]; diagnostics: ImportDiagnostic[]; }
export interface ParsedPerformanceRow { rowNumber: number; uid: string | null; name: string; normalizedName: string; performance: PlayerPerformanceData; }
export interface ParsedPerformanceView { headers: string[]; rows: ParsedPerformanceRow[]; diagnostics: ImportDiagnostic[]; }

export function parseAttributeViewHtml(html: string): ParsedAttributeView {
  const table = readTable(html); const diagnostics: ImportDiagnostic[] = [];
  duplicateHeaderOccurrences(table.headers, 'attribute', diagnostics);
  if (!indices(table.headers, ['uid']).length || !indices(table.headers, ['name', 'nama', 'player']).length) diagnostics.push({ code: 'attribute_identity_schema_missing', severity: 'fatal', message: 'Attribute View requires UID and Name columns.' });
  const players = table.rows.flatMap(row => {
    if (row.cells.length < table.headers.length) { diagnostics.push({ code: 'malformed_attribute_row', severity: 'warning', message: `Attribute row ${row.rowNumber} has too few cells.`, rowNumber: row.rowNumber }); return []; }
    const name = first(row, table.headers, ['name', 'nama', 'player']).trim(); if (!name) { diagnostics.push({ code: 'malformed_attribute_row', severity: 'warning', message: `Attribute row ${row.rowNumber} has no name.`, rowNumber: row.rowNumber }); return []; }
    const rawUid = first(row, table.headers, ['uid']).trim(); const uid = rawUid && !/^[-–—]$/.test(rawUid) ? rawUid : null; const attributes: Record<string, number> = {}; const natIndex = indices(table.headers, ['nat'])[0];
    table.headers.forEach((header, index) => { const key = ATTRIBUTE_ALIASES[header]; const value = numeric(row.cells[index] ?? ''); if (key && index !== natIndex && value !== null && value >= 1 && value <= 20) attributes[key] = value; });
    const importedIdentity: ImportedIdentity = { uid, normalizedName: normalizeImportName(name), sourceRow: row.rowNumber };
    return [{ id: uid ? `fm-uid-${uid}` : `fm-name-${importedIdentity.normalizedName}`, name, age: numeric(first(row, table.headers, ['age', 'umur'])) ?? 0, club: first(row, table.headers, ['club', 'klub']) || undefined, nationality: first(row, table.headers, ['nationality', 'nation', 'nat']) || undefined, positions: parsePositions(`${first(row, table.headers, ['position', 'pos', 'posisi'])}, ${first(row, table.headers, ['sec. position', 'secondary position', 'sec position'])}`), attributes, importedIdentity }];
  }); return { headers: table.headers, players, diagnostics };
}
function parseApps(raw: string): { appearances: number | null; starts: number | null; substituteAppearances: number | null } { const match = raw.match(/^\s*(\d+)\s*(?:\(\s*(\d+)\s*\))?\s*$/); if (!match) return { appearances: numeric(raw), starts: null, substituteAppearances: null }; const starts = Number(match[1]); const substituteAppearances = match[2] ? Number(match[2]) : 0; return { appearances: starts + substituteAppearances, starts, substituteAppearances }; }
export function parsePerformanceViewHtml(html: string): ParsedPerformanceView {
  const table = readTable(html); const diagnostics: ImportDiagnostic[] = [];
  duplicateHeaderOccurrences(table.headers, 'performance', diagnostics);
  if (!indices(table.headers, ['uid']).length || !indices(table.headers, ['name', 'nama', 'player']).length) diagnostics.push({ code: 'performance_identity_schema_missing', severity: 'fatal', message: 'Performance View requires UID and Name columns.' });
  const rows: ParsedPerformanceRow[] = table.rows.flatMap(row => { if (row.cells.length < table.headers.length) { diagnostics.push({ code: 'malformed_performance_row', severity: 'warning', message: `Performance row ${row.rowNumber} has too few cells.`, rowNumber: row.rowNumber }); return []; } const name = first(row, table.headers, ['name', 'nama', 'player']).trim(); if (!name) { diagnostics.push({ code: 'malformed_performance_row', severity: 'warning', message: `Performance row ${row.rowNumber} has no name.`, rowNumber: row.rowNumber }); return []; } const core: Record<string, number | null> = { minutes: null, appearances: null, starts: null, subAppearances: null, averageRating: null }; const metrics: Record<string, number> = {}; table.headers.forEach((header, index) => { const key = PERFORMANCE_HEADER_ALIASES[header]; const value = numeric(row.cells[index] ?? ''); if (!key || value === null) return; if (key in core) core[key] = value; else metrics[key] = value; }); const appsRaw = first(row, table.headers, ['apps', 'appearances', 'app']); const apps = parseApps(appsRaw); const rawUid = first(row, table.headers, ['uid']).trim(); const performance: PlayerPerformanceData = { minutesPlayed: core.minutes, appearances: apps.appearances ?? core.appearances, starts: core.starts ?? apps.starts, substituteAppearances: core.subAppearances ?? apps.substituteAppearances, averageRating: core.averageRating, metrics, importedHeaders: table.headers, minutesKind: 'total_minutes_proxy', appearanceSource: appsRaw || undefined }; return [{ rowNumber: row.rowNumber, uid: rawUid && !/^[-–—]$/.test(rawUid) ? rawUid : null, name, normalizedName: normalizeImportName(name), performance }]; });
  return { headers: table.headers, rows, diagnostics };
}
function coverage(records: Record<string, number>[]): Record<string, number> { const result: Record<string, number> = {}; records.forEach(record => Object.keys(record).forEach(key => { result[key] = (result[key] ?? 0) + 1; })); return result; }
function deepFreeze<T>(value: T): T { Object.freeze(value); if (value && typeof value === 'object') Object.values(value as object).forEach(child => { if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child); }); return value; }
/**
 * Canonical scoring-input identity for an imported squad. Row/export ordering
 * is ignored, while every input that can affect Player Lab fit is retained.
 */
export function createImportedSnapshotId(players: readonly Player[]): string {
  const snapshotPayload = players.map(player => ({
    id: player.id,
    name: player.name,
    identity: player.importedIdentity ? {
      uid: player.importedIdentity.uid,
      normalizedName: player.importedIdentity.normalizedName,
    } : null,
    positions: [...player.positions].sort((a, b) => a.position.localeCompare(b.position) || a.familiarity.localeCompare(b.familiarity)),
    attributes: Object.fromEntries(Object.entries(player.attributes).sort(([a], [b]) => a.localeCompare(b))),
    performance: player.performance ? {
      minutesPlayed: player.performance.minutesPlayed,
      appearances: player.performance.appearances,
      starts: player.performance.starts,
      substituteAppearances: player.performance.substituteAppearances,
      averageRating: player.performance.averageRating,
      minutesKind: player.performance.minutesKind,
      metrics: Object.fromEntries(Object.entries(player.performance.metrics).sort(([a], [b]) => a.localeCompare(b))),
    } : null,
  })).sort((a, b) => a.id.localeCompare(b.id));
  return `import-${hashStringDeterministic(JSON.stringify(snapshotPayload))}`;
}
export function createImportDraft(attributeHtml: string, performanceHtml: string): ImportDraft {
  const attributes = parseAttributeViewHtml(attributeHtml); const performances = parsePerformanceViewHtml(performanceHtml); const diagnostics = [...attributes.diagnostics, ...performances.diagnostics];
  for (const [side, values] of [['attribute', attributes.players.map(player => player.importedIdentity?.uid)], ['performance', performances.rows.map(row => row.uid)]] as const) { const seen = new Set<string>(); values.forEach(value => { if (!value) return; if (seen.has(value)) diagnostics.push({ code: `duplicate_${side}_uid`, severity: 'fatal', message: `Duplicate ${side} UID ${value}.`, identity: value }); seen.add(value); }); }
  const perfByUid = new Map<string, ParsedPerformanceRow>(); performances.rows.forEach(row => { if (row.uid) perfByUid.set(row.uid, row); }); const attrNames = new Map<string, Player[]>(); const perfNames = new Map<string, ParsedPerformanceRow[]>(); attributes.players.forEach(player => { const key = player.importedIdentity!.normalizedName; attrNames.set(key, [...(attrNames.get(key) ?? []), player]); }); performances.rows.forEach(row => perfNames.set(row.normalizedName, [...(perfNames.get(row.normalizedName) ?? []), row]));
  for (const [name, matches] of attrNames) {
    if (matches.filter(player => !player.importedIdentity!.uid).length > 1) {
      diagnostics.push({ code: 'ambiguous_name_fallback', severity: 'fatal', message: `Cannot safely identify repeated UID-less name ${name}.`, identity: name });
    }
  }
  const used = new Set<ParsedPerformanceRow>(); let uidMatches = 0; let nameFallbackMatches = 0;
  const players = attributes.players.map(player => { const identity = player.importedIdentity!; let match: ParsedPerformanceRow | undefined; if (identity.uid) { match = perfByUid.get(identity.uid); if (match) uidMatches++; } else { const candidates = perfNames.get(identity.normalizedName) ?? []; if ((attrNames.get(identity.normalizedName)?.length === 1) && candidates.length === 1) { match = candidates[0]; nameFallbackMatches++; diagnostics.push({ code: 'name_fallback_match', severity: 'warning', message: `Matched ${player.name} by unique name because the Attribute UID is absent.`, identity: player.id }); } else if (candidates.length) diagnostics.push({ code: 'ambiguous_name_fallback', severity: 'fatal', message: `Cannot safely match ${player.name} by name.`, identity: player.id }); } if (match) { used.add(match); return { ...player, performance: match.performance }; } diagnostics.push({ code: 'unmatched_attribute_row', severity: 'warning', message: `No Performance View row matched ${player.name}; performance remains unknown.`, identity: player.id, rowNumber: identity.sourceRow }); return player; });
  performances.rows.filter(row => !used.has(row)).forEach(row => diagnostics.push({ code: 'unmatched_performance_row', severity: 'warning', message: `Performance-only row ${row.name} was discarded.`, identity: row.uid ?? row.normalizedName, rowNumber: row.rowNumber })); if (!players.length) diagnostics.push({ code: 'empty_attribute_dataset', severity: 'fatal', message: 'Attribute View contains no valid player rows.' });
  const report = { attributeRows: attributes.players.length, performanceRows: performances.rows.length, joinedRows: uidMatches + nameFallbackMatches, uidMatches, nameFallbackMatches, unmatchedAttributeRows: players.filter(player => !player.performance).length, unmatchedPerformanceRows: performances.rows.length - used.size, attributeHeaderCount: attributes.headers.length, performanceHeaderCount: performances.headers.length, attributeCoverage: coverage(players.map(player => player.attributes)), performanceCoverage: coverage(players.map(player => player.performance?.metrics ?? {})), attributeHeaderCoverage: headerCoverage(attributes.headers, ATTRIBUTE_ALIASES, ['uid', 'name', 'nama', 'player', 'age', 'umur', 'club', 'klub', 'nationality', 'nation', 'position', 'pos', 'posisi', 'sec. position', 'secondary position', 'sec position']), performanceHeaderCoverage: headerCoverage(performances.headers, PERFORMANCE_HEADER_ALIASES, ['uid', 'name', 'nama', 'player', 'position', 'pos', 'posisi']), duplicateHeaderOccurrences: diagnostics.filter(diagnostic => diagnostic.code === 'duplicate_header_occurrence').map(diagnostic => ({ view: diagnostic.message.startsWith('Attribute') ? 'attribute' as const : 'performance' as const, header: diagnostic.identity ?? '', occurrences: Number(diagnostic.message.match(/(\d+) times/)?.[1] ?? 2) })) };
  return deepFreeze({ canConfirm: !diagnostics.some(diagnostic => diagnostic.severity === 'fatal'), snapshotId: createImportedSnapshotId(players), players, diagnostics, report });
}
export function parseFMHtml(html: string): Player[] { return parseAttributeViewHtml(html).players; }
export function parsePositions(value: string): { position: Position; familiarity: PositionalFamiliarity }[] { const source = value.toUpperCase().replace(/\s+/g, ' ').replace(/\b(D|M)\/(WB|AM)\s*\(([^)]+)\)/g, '$1 ($3), $2 ($3)').trim(); const found = new Set<Position>(); if (/\bGK\b/.test(source)) found.add('GK'); for (const match of source.matchAll(/\b(AM|WB|DM|M|D|ST)\s*\(([^)]+)\)|\b(STC?|AMC|AMR|AML|WBR|WBL|DC|DR|DL|MC|MR|ML|DM)\b/g)) { if (match[3]) { found.add((match[3] === 'ST' ? 'STC' : match[3]) as Position); continue; } const family = match[1]; if (family === 'DM') { found.add('DM'); continue; } if (family === 'ST') { found.add('STC'); continue; } for (const channel of match[2] ?? '') { const map: Record<string, Record<string, Position>> = { D: { R: 'DR', L: 'DL', C: 'DC' }, WB: { R: 'WBR', L: 'WBL' }, M: { R: 'MR', L: 'ML', C: 'MC' }, AM: { R: 'AMR', L: 'AML', C: 'AMC' } }; const position = map[family]?.[channel]; if (position) found.add(position); } } return [...found].map(position => ({ position, familiarity: 'Natural' })); }
