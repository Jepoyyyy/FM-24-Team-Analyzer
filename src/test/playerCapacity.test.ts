// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Player } from '../types';
import { calculatePlayerCapacityProfile } from '../engine/v2/playerCapacity';

function player(attributes: Record<string, number>): Player {
  return {
    id: 'right-back',
    name: 'Right Back',
    age: 24,
    positions: [{ position: 'DR', familiarity: 'Natural' }],
    attributes,
  };
}

describe('Player Functional Capacity Matrix', () => {
  it('keeps attacking delivery separate from defensive recovery', () => {
    const profile = calculatePlayerCapacityProfile(player({
      crossing: 8, technique: 9, firstTouch: 10, decisions: 10, vision: 8, anticipation: 16,
      composure: 10, balance: 13, acceleration: 17, pace: 17, agility: 15,
      positioning: 16, stamina: 16, workRate: 17,
    }), 'DR');

    const crossing = profile.functions.find(item => item.functionId === 'cross_delivery')!;
    const recovery = profile.functions.find(item => item.functionId === 'recovery_run')!;
    expect(crossing.capacity).not.toBeNull();
    expect(recovery.capacity).not.toBeNull();
    expect(recovery.capacity!).toBeGreaterThan(crossing.capacity!);
  });

  it('does not replace missing attributes with a default value', () => {
    const profile = calculatePlayerCapacityProfile(player({ crossing: 14 }), 'DR');
    const crossing = profile.functions.find(item => item.functionId === 'cross_delivery')!;
    expect(crossing.dataConfidence).toBeLessThanOrEqual(35);
    expect(crossing.capacity).toBeNull();
    expect(crossing.missingInputs).toContain('decisions');
  });

  it('reports positional availability separately from capacity', () => {
    const source = player({ acceleration: 15, pace: 15, offTheBall: 14, anticipation: 14, decisions: 14, stamina: 15, workRate: 15 });
    const natural = calculatePlayerCapacityProfile(source, 'DR');
    const unfamiliar = calculatePlayerCapacityProfile(source, 'DL');
    expect(natural.positionalAvailability).toBe(100);
    expect(unfamiliar.positionalAvailability).toBe(40);
    expect(natural.functions[0].capacity).toBe(unfamiliar.functions[0].capacity);
  });
});
