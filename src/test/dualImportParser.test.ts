import { describe, expect, it } from 'vitest';
import { createImportDraft, parseAttributeViewHtml, parsePerformanceViewHtml, parsePositions, safeRatio } from '../engine/parser';

const table = (headers: string[], rows: string[][]) => `<table><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;

describe('dual FM export import draft', () => {
  it('preserves snapshot identity when both exports are reordered, including unique name fallback', () => {
    const attributeRows = [['1', 'Alpha', 'DR', '14'], ['-', 'Fallback', 'DL', '15']];
    const performanceRows = [['1', 'Alpha', '270', '1.5'], ['-', 'Fallback', '180', '2']];
    const attributeHeaders = ['UID', 'Name', 'Position', 'Pac'];
    const performanceHeaders = ['UID', 'Name', 'Mins', 'Cr C/90'];
    const original = createImportDraft(table(attributeHeaders, attributeRows), table(performanceHeaders, performanceRows));
    const reordered = createImportDraft(table(attributeHeaders, [...attributeRows].reverse()), table(performanceHeaders, [...performanceRows].reverse()));
    expect(original.canConfirm).toBe(true);
    expect(reordered.canConfirm).toBe(true);
    expect(reordered.snapshotId).toBe(original.snapshotId);
    expect(reordered.players[0].importedIdentity!.sourceRow).not.toBe(original.players[1].importedIdentity!.sourceRow);
    expect(reordered.report).toEqual(original.report);
  });

  it('keeps duplicate Nat by occurrence and joins the supplied exports by UID', () => {
    const attrHeaders = ['UID', 'Name', 'Position', 'Nat', 'Nat', 'Pac'];
    const attrRows = [
      ['101', 'Player Alpha', 'AM (R), ST (C)', 'GHA', '12', '15'],
      ['102', 'Keeper Beta', 'GK', 'ITA', '14', '11'],
    ];
    const perfHeaders = ['UID', 'Name', 'Mins', 'xG/90', 'Pres C/90', 'xSv %', 'xGP/90'];
    const perfRows = [
      ['101', 'Player Alpha', '900', '0.45', '1.20', '-', '-'],
      ['102', 'Keeper Beta', '900', '-', '-', '85%', '0.35'],
    ];

    const draft = createImportDraft(table(attrHeaders, attrRows), table(perfHeaders, perfRows));
    expect(draft.canConfirm).toBe(true);
    expect(draft.report).toMatchObject({
      attributeHeaderCount: 6,
      performanceHeaderCount: 7,
      attributeRows: 2,
      performanceRows: 2,
      uidMatches: 2,
      joinedRows: 2,
    });
    expect(new Set(draft.players.map(player => player.id)).size).toBe(2);

    const outfield = draft.players.find(player => player.id === 'fm-uid-101');
    expect(outfield).toMatchObject({ id: 'fm-uid-101', nationality: 'GHA' });
    expect(outfield?.attributes.naturalFitness).toBe(12);
    expect(outfield?.performance?.metrics.xgP90).toBe(0.45);
    expect(outfield?.performance?.metrics.pressuresCompletedP90).toBe(1.2);

    const keeper = draft.players.find(player => player.id === 'fm-uid-102');
    expect(keeper?.performance?.metrics.goalsPrevented).toBe(0.35);
    expect(keeper?.performance?.metrics.expectedSavePct).toBe(85);
    expect(Object.entries(draft.report.performanceHeaderCoverage ?? {}).some(([header, state]) => header.startsWith('xsv %') && state === 'mapped')).toBe(true);
  });

  it('uses strict UID identity, retains Attribute-only rows, and discards Performance-only rows', () => {
    const attributes = table(['UID', 'Name', 'Position', 'Nat', 'Nat'], [['1', 'Same Name', 'D (C)', 'ENG', '12'], ['2', 'Same Name', 'M (C)', 'ENG', '13'], ['-', 'Fallback', 'AM (RL)', 'ENG', '14']]);
    const performance = table(['UID', 'Name', 'Apps', 'Mins'], [['1', 'Same Name', '0 (2)', '20'], ['2', 'Same Name', '3', '270'], ['-', 'Fallback', '2 (1)', '90'], ['9', 'Only Performance', '1', '10']]);
    const draft = createImportDraft(attributes, performance);
    expect(draft.canConfirm).toBe(true);
    expect(draft.players.map(player => player.id)).toEqual(['fm-uid-1', 'fm-uid-2', 'fm-name-fallback']);
    expect(draft.players[0].performance).toMatchObject({ appearances: 2, starts: 0, substituteAppearances: 2 });
    expect(draft.players[2].performance).toMatchObject({ appearances: 3, starts: 2, substituteAppearances: 1 });
    expect(draft.diagnostics.map(diagnostic => diagnostic.code)).toContain('unmatched_performance_row');
  });

  it('rejects duplicate UIDs and ambiguous UID-less names', () => {
    const duplicate = createImportDraft(table(['UID', 'Name'], [['1', 'A'], ['1', 'B']]), table(['UID', 'Name'], [['1', 'A']]));
    const ambiguous = createImportDraft(table(['UID', 'Name'], [['-', 'A'], ['-', 'A']]), table(['UID', 'Name'], [['-', 'A']]));
    expect(duplicate.canConfirm).toBe(false);
    expect(ambiguous.canConfirm).toBe(false);
    expect(ambiguous.diagnostics.some(diagnostic => diagnostic.code === 'ambiguous_name_fallback')).toBe(true);
    const unmatchedAmbiguous = createImportDraft(table(['UID', 'Name'], [['-', 'A'], ['-', 'A']]), table(['UID', 'Name'], [['7', 'Someone Else']]));
    expect(unmatchedAmbiguous.canConfirm).toBe(false);
  });

  it('preserves missing values, malformed diagnostics, guarded ratios, and combined positions', () => {
    const parsed = parseAttributeViewHtml(table(['UID', 'Name', 'Position', 'Sec. Position', 'Pac'], [['1', 'A', 'D/WB (RL)', 'M/AM (RL)', '-'], ['2', '', 'DM, M/AM (C)', '-', '12']]));
    expect(parsed.players[0].attributes.pace).toBeUndefined();
    expect(parsed.diagnostics.some(diagnostic => diagnostic.code === 'malformed_attribute_row')).toBe(true);
    expect(parsePositions('DM, M/AM (C), AM (RL), ST (C)').map(item => item.position)).toEqual(expect.arrayContaining(['DM', 'MC', 'AMC', 'AMR', 'AML', 'STC']));
    expect(safeRatio(1, 0)).toBeNull();
    expect(safeRatio(3, 2)).toBe(1.5);
    expect(parsePerformanceViewHtml(table(['UID', 'Name', 'Apps'], [['1', 'A', '-']])).rows[0].performance.appearances).toBeNull();
  });

  it('reports duplicate header occurrences and changes snapshot identity when joined football data changes', () => {
    const attributes = table(['UID', 'Name', 'Position', 'Nat', 'Nat', 'Pac'], [['1', 'A', 'D (R)', 'ENG', '14', '12']]);
    const performance = table(['UID', 'Name', 'Mins', 'xSv %', 'xGP/90', 'Pres C/90', 'Pres A/90', 'Pres C/A'], [['1', 'A', '90', '71', '0.4', '3', '5', '0.6']]);
    const first = createImportDraft(attributes, performance);
    const changed = createImportDraft(attributes.replace('<td>12</td>', '<td>13</td>'), performance);
    expect(first.diagnostics.some(diagnostic => diagnostic.code === 'duplicate_header_occurrence')).toBe(true);
    expect(first.report.duplicateHeaderOccurrences).toContainEqual({ view: 'attribute', header: 'nat', occurrences: 2 });
    expect(first.players[0].performance?.metrics).toMatchObject({ expectedSavePct: 71, goalsPrevented: 0.4, pressuresCompletedP90: 3, pressureSuccessPct: 0.6 });
    expect(first.snapshotId).not.toBe(changed.snapshotId);
  });
});
