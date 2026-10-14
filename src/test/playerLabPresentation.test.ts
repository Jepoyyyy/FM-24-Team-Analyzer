// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { playerLabCandidateKey, visiblePlayerLabRows } from '../engine/v2/playerLabPresentation';

describe('Player Lab presentation collection rules', () => {
  it('keeps natural and experimental evaluations of one player independently selectable', () => {
    const natural = { candidateType: 'natural' as const, playerId: 'player-7', bestSlot: { slotId: 'rb' } };
    const experimental = { candidateType: 'experimental' as const, playerId: 'player-7', bestSlot: { slotId: 'rwb' } };
    expect(playerLabCandidateKey(natural)).not.toBe(playerLabCandidateKey(experimental));
  });

  it('exposes an experimental-only collection when the opt-in is enabled', () => {
    const experimental = [{ candidateType: 'experimental' as const, playerId: 'player-7', bestSlot: { slotId: 'rwb' } }];
    expect(visiblePlayerLabRows([], experimental, false)).toEqual([]);
    expect(visiblePlayerLabRows([], experimental, true)).toEqual(experimental);
  });
});
