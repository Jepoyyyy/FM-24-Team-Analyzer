import { describe, it, expect } from 'vitest';
import { ALL_ROLES, getRoleById, getRolesByPosition } from '../engine/roles';
import { FORMATION_TEMPLATES, detectFormationShape } from '../engine/formations';
import { calculateTacticalHealth, auditTactics } from '../engine/validator';
import { calculateRoleSuitability } from '../engine/suitability';
import { parseFMHtml } from '../engine/parser';
import { evaluateFormationReasoningAndImpact } from '../engine/reasoning';
import { runSandboxSimulation, SANDBOX_OPPONENTS } from '../engine/sandbox';
import { DEFAULT_TEAM_INSTRUCTIONS, Player, TacticSlot } from '../types';
import { DEMO_SQUADS } from '../data/demoSquads';

function toTacticSlots(slots: (typeof FORMATION_TEMPLATES)[0]['slots']): TacticSlot[] {
  return slots.map(s => ({
    ...s,
    customPIs: [],
  }));
}

describe('Tahap 1 Baseline Safety: Existing Engine Behaviors', () => {
  // 1. Roles & Duties
  describe('Roles & Duties Baseline', () => {
    it('contains all essential FM24 roles across all pitch positions', () => {
      expect(ALL_ROLES.length).toBeGreaterThan(30);
      const gkRoles = getRolesByPosition('GK');
      expect(gkRoles.map(r => r.id)).toContain('gk');
      expect(gkRoles.map(r => r.id)).toContain('sk');

      const dcRoles = getRolesByPosition('DC');
      expect(dcRoles.map(r => r.id)).toContain('bpd');
      expect(dcRoles.map(r => r.id)).toContain('cd');
      expect(dcRoles.map(r => r.id)).toContain('wcb');

      const dmRoles = getRolesByPosition('DM');
      expect(dmRoles.map(r => r.id)).toContain('anchor');
      expect(dmRoles.map(r => r.id)).toContain('half_back');
      expect(dmRoles.map(r => r.id)).toContain('segundo_volante');
    });

    it('returns undefined for non-existent role id', () => {
      expect(getRoleById('non_existent_role')).toBeUndefined();
    });

    it('bpd role has correct available duties and key attributes', () => {
      const bpd = getRoleById('bpd');
      expect(bpd).toBeDefined();
      expect(bpd?.availableDuties).toContain('Defend');
      expect(bpd?.keyAttributes).toContain('passing');
      expect(bpd?.keyAttributes).toContain('composure');
    });
  });

  // 2. Formations & Shapes
  describe('Formations & Detection Baseline', () => {
    it('has standard formation templates including 4-2-3-1, 4-3-3, 3-4-2-1', () => {
      const ids = FORMATION_TEMPLATES.map(f => f.id);
      expect(ids).toContain('4231_dm_wide');
      expect(ids).toContain('433_dm_wide');
      expect(ids).toContain('3421_box');
    });

    it('correctly detects a 4-2-3-1 formation shape and balance', () => {
      const template = FORMATION_TEMPLATES.find(f => f.id === '4231_dm_wide')!;
      const detected = detectFormationShape(toTacticSlots(template.slots));
      expect(detected.name).toBe('4-2-3-1 DM Wide');
      expect(detected.restDefenceCount).toBeGreaterThanOrEqual(2);
      expect(detected.dutyDistribution).toBeDefined();
    });
  });

  // 3. Tactical Health & Structural Integrity Baseline
  describe('Tactical Health & Structural Integrity Baseline', () => {
    it('gives score <= 18 and unplayable status when Goalkeeper is missing', () => {
      const template = FORMATION_TEMPLATES.find(f => f.id === '4231_dm_wide')!;
      const validSlots = toTacticSlots(template.slots);
      const invalidSlots = validSlots.filter(s => s.position !== 'GK');
      // Create a 10-player slot without GK + 1 random outfield to make 11
      const fakeSlots: TacticSlot[] = [
        ...invalidSlots,
        {
          slotId: 'extra_st',
          position: 'STC',
          x: 50,
          y: 85,
          roleId: 'af',
          duty: 'Attack',
          customPIs: [],
        },
      ];

      const dummyPlayers = new Map<string, Player>();
      const issues = auditTactics(fakeSlots, DEFAULT_TEAM_INSTRUCTIONS, dummyPlayers);
      const health = calculateTacticalHealth(fakeSlots, issues);

      expect(health.isLayer1Valid).toBe(false);
      expect(health.status).toBe('unplayable');
      expect(health.score).toBeLessThanOrEqual(18);
      expect(health.fatalError).toContain('Penjaga Gawang');
    });

    it('gives high score for well-balanced 4-2-3-1 without critical issues', () => {
      const template = FORMATION_TEMPLATES.find(f => f.id === '4231_dm_wide')!;
      const slots = toTacticSlots(template.slots);
      const dummyPlayers = new Map<string, Player>();
      const issues = auditTactics(slots, DEFAULT_TEAM_INSTRUCTIONS, dummyPlayers);
      const health = calculateTacticalHealth(slots, issues);

      expect(health.isLayer1Valid).toBe(true);
      expect(health.score).toBeGreaterThan(60);
    });
  });

  // 4. Role Suitability Formula
  describe('Role Suitability Formula Baseline', () => {
    it('calculates higher suitability for natural position with high key attributes', () => {
      const testPlayer: Player = {
        id: 'test_bpd',
        name: 'Elite Defender',
        age: 26,
        positions: [{ position: 'DC', familiarity: 'Natural' }],
        attributes: {
          tackling: 18,
          marking: 17,
          heading: 16,
          positioning: 16,
          passing: 17,
          composure: 16,
          vision: 14,
          firstTouch: 14,
          technique: 14,
          anticipation: 15,
          decisions: 15,
          concentration: 15,
          pace: 14,
          jumpingReach: 15,
          strength: 15,
        },
      };

      const bpdRole = getRoleById('bpd')!;
      const suitability = calculateRoleSuitability(testPlayer, bpdRole, 'DC');
      expect(suitability.score).toBeGreaterThan(75);
      expect(suitability.familiarityMultiplier).toBe(1.0);
    });

    it('penalizes player playing out of position with unconvincing familiarity', () => {
      const testPlayer: Player = {
        id: 'test_winger',
        name: 'Fast Winger',
        age: 22,
        positions: [{ position: 'AML', familiarity: 'Natural' }],
        attributes: {
          pace: 18,
          acceleration: 17,
          dribbling: 16,
          tackling: 4,
          marking: 3,
        },
      };

      const bpdRole = getRoleById('bpd')!;
      const suitability = calculateRoleSuitability(testPlayer, bpdRole, 'DC');
      expect(suitability.score).toBeLessThan(35);
      expect(suitability.familiarityMultiplier).toBeLessThan(0.6);
    });
  });

  // 5. FM HTML Parser Baseline
  describe('FM HTML Parser Baseline', () => {
    it('throws error when table tag is missing from HTML export', () => {
      expect(() => parseFMHtml('<div>Not valid FM24 export</div>')).toThrow(
        'Tidak ditemukan tabel data pemain pada file HTML ini.'
      );
    });

    it('parses valid HTML table with player attributes correctly', () => {
      const sampleHtml = `
        <html>
          <body>
            <table>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Age</th>
                <th>Pac</th>
                <th>Acc</th>
                <th>Pas</th>
                <th>Tck</th>
              </tr>
              <tr>
                <td>Bukayo Saka</td>
                <td>AM (RL)</td>
                <td>22</td>
                <td>16</td>
                <td>16</td>
                <td>15</td>
                <td>11</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const players = parseFMHtml(sampleHtml);
      expect(players.length).toBe(1);
      expect(players[0].name).toBe('Bukayo Saka');
      expect(players[0].age).toBe(22);
      expect(players[0].attributes.pace).toBe(16);
      expect(players[0].attributes.passing).toBe(15);
      expect(players[0].positions.length).toBeGreaterThan(0);
    });
  });

  // 6. Live Formation Reasoning & Player Impact
  describe('Live Formation Reasoning Baseline', () => {
    it('evaluates formation reasoning pillars with 5 core categories', () => {
      const template = FORMATION_TEMPLATES.find(f => f.id === '4231_dm_wide')!;
      const slots = toTacticSlots(template.slots);
      const squad = DEMO_SQUADS[0];
      const playersMap = new Map<string, Player>();
      squad.players.forEach(p => playersMap.set(p.id, p));

      const issues = auditTactics(slots, DEFAULT_TEAM_INSTRUCTIONS, playersMap);
      const evaluation = evaluateFormationReasoningAndImpact(
        slots,
        DEFAULT_TEAM_INSTRUCTIONS,
        playersMap,
        issues
      );

      expect(evaluation.reasoning.length).toBe(5);
      const categories = evaluation.reasoning.map(r => r.category);
      expect(categories).toContain('flank');
      expect(categories).toContain('midfield');
      expect(categories).toContain('attack');
      expect(categories).toContain('defence');
      expect(categories).toContain('transition');
      expect(evaluation.playerImpacts.length).toBe(11);
    });
  });

  // 7. Matchup / Sandbox Simulation
  describe('Sandbox Matchup Baseline', () => {
    it('evaluates all 8 tactical opponents and generates outcomes', () => {
      const template = FORMATION_TEMPLATES.find(f => f.id === '4231_dm_wide')!;
      const slots = toTacticSlots(template.slots);
      const squad = DEMO_SQUADS[0];
      const playersMap = new Map<string, Player>();
      squad.players.forEach(p => playersMap.set(p.id, p));

      const results = runSandboxSimulation(slots, DEFAULT_TEAM_INSTRUCTIONS, playersMap);
      expect(results.length).toBe(SANDBOX_OPPONENTS.length);
      results.forEach(res => {
        expect(res.winProbability + res.drawProbability + res.lossProbability).toBe(100);
        expect(['win', 'draw', 'loss']).toContain(res.dominantOutcome);
        expect(res.scores.flankVulnerability).toBeGreaterThanOrEqual(10);
      });
    });
  });
});
