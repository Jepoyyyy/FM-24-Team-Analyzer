// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ALL_ROLES } from '../engine/roles';
import { ALL_ROLE_MATRIX_DEFINITIONS, rankPlayersForTacticSlot } from '../engine/v2/tacticPlayerMatrix';
import { Player } from '../types';

const importedPlayer: Player = { id: 'stable-fullback', name: 'Stable Fullback', age: 25, positions: [{ position: 'DR', familiarity: 'Natural' }, { position: 'DL', familiarity: 'Natural' }], attributes: { acceleration: 14, pace: 15, crossing: 13, tackling: 15 }, performance: { minutesPlayed: 1980, appearances: 24, starts: 22, substituteAppearances: 2, averageRating: 7.1, minutesKind: 'total_minutes_proxy', importedHeaders: [], metrics: { tackleWinPct: 78, crossesCompletedP90: 1.8, dribblesP90: 2.1 } } };

describe('tactic-scoped player matrix', () => {
  it('provides a matrix definition for every declared role-duty combination', () => {
    const expected = ALL_ROLES.reduce((sum, role) => sum + role.availableDuties.length, 0);
    expect(ALL_ROLE_MATRIX_DEFINITIONS).toHaveLength(expected);
    expect(ALL_ROLE_MATRIX_DEFINITIONS.every(definition => definition.metrics.length > 0)).toBe(true);
  });

  it('ranks only players eligible for the tactic slot and reports missing fields', () => {
    const ranked = rankPlayersForTacticSlot({ slotId: 'right', position: 'DR', x: 80, y: 40, roleId: 'wb', duty: 'Attack', customPIs: [] }, [importedPlayer]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].playerName).toBe('Stable Fullback');
    expect(ranked[0].minutesKind).toBe('total_minutes_proxy');
    expect(ranked[0].metricCoverage).toBeGreaterThan(0);
  });
});
