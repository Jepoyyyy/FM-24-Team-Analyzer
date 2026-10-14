// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createImportedSnapshotId } from '../engine/parser';
import { Player } from '../types';

const imported = (pace: number, crosses: number): Player => ({
  id: 'fm-uid-1', name: 'Example Player', age: 24,
  positions: [{ position: 'DR', familiarity: 'Natural' }],
  attributes: { pace, crossing: 14 },
  importedIdentity: { uid: '1', normalizedName: 'exampleplayer', sourceRow: 2 },
  performance: {
    minutesPlayed: 270, appearances: 3, starts: 3, substituteAppearances: 0,
    averageRating: 7, minutesKind: 'total_minutes_proxy',
    importedHeaders: ['Name', 'Mins', 'Cr C/90'], metrics: { crossesCompletedP90: crosses },
  },
});

describe('canonical imported snapshot identity', () => {
  it('changes for an attribute or observed performance change, but not player order or non-scoring export metadata', () => {
    const first = imported(14, 1.5);
    const teammate = { ...imported(13, 1.2), id: 'fm-uid-2', name: 'Teammate', importedIdentity: { uid: '2', normalizedName: 'teammate', sourceRow: 3 } };
    expect(createImportedSnapshotId([first, teammate])).toBe(createImportedSnapshotId([teammate, first]));
    expect(createImportedSnapshotId([first, teammate])).toBe(createImportedSnapshotId([
      { ...teammate, importedIdentity: { ...teammate.importedIdentity, sourceRow: 2 } },
      { ...first, importedIdentity: { ...first.importedIdentity!, sourceRow: 3 } },
    ]));
    expect(createImportedSnapshotId([first])).not.toBe(createImportedSnapshotId([imported(15, 1.5)]));
    expect(createImportedSnapshotId([first])).not.toBe(createImportedSnapshotId([imported(14, 1.6)]));
    expect(createImportedSnapshotId([first])).toBe(createImportedSnapshotId([{ ...first, performance: { ...first.performance!, importedHeaders: ['Cr C/90', 'Mins', 'Name'] } }]));
  });
  it('retains player identity, familiarity, missingness and performance reliability semantics', () => {
    const first = imported(14, 1.5);
    for (const changed of [
      { ...first, name: 'Renamed Player' },
      { ...first, positions: [{ position: 'DR' as const, familiarity: 'Accomplished' as const }] },
      { ...first, attributes: { pace: 14 } },
      { ...first, performance: { ...first.performance!, minutesPlayed: 13 } },
      { ...first, performance: { ...first.performance!, minutesKind: 'role_minutes' as const } },
      { ...first, performance: undefined },
    ]) {
      expect(createImportedSnapshotId([changed])).not.toBe(createImportedSnapshotId([first]));
    }
  });
});
