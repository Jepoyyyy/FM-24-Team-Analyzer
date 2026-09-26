import { describe, it, expect } from 'vitest';
import {
  ROLE_DUTY_PROFILES,
  getRoleDutyProfile,
  isRoleDutyCompatible,
} from '../engine/v2/roleDutyProfiles';
import {
  evaluateDataCompleteness,
  calculateRoleDutySuitabilityV2,
  getFamiliarityMultiplierV2,
} from '../engine/v2/confidence';
import {
  createSimulationSnapshot,
  isSnapshotStale,
} from '../engine/v2/snapshot';
import {
  migrateV1ToV2,
} from '../engine/v2/persistence';
import { PlayerV2 } from '../engine/v2/types';
import { DEFAULT_TEAM_INSTRUCTIONS } from '../types';
import { FORMATION_TEMPLATES } from '../engine/formations';

describe('Tahap 2: Domain Model & Normalization v2', () => {
  // 1. RoleDutyProfile behaviors
  describe('RoleDutyProfiles v2', () => {
    it('contains valid role+duty combinations with detailed movement and possession behaviors', () => {
      expect(ROLE_DUTY_PROFILES.length).toBeGreaterThan(15);

      const bpdDefend = getRoleDutyProfile('bpd', 'Defend');
      expect(bpdDefend).toBeDefined();
      expect(bpdDefend?.duty).toBe('Defend');
      expect(bpdDefend?.compatiblePositions).toContain('DC');
      expect(bpdDefend?.possession.passingRisk).toBe('take_more_risks');
      expect(bpdDefend?.movement.depth).toBe('stay_back');

      const cdStopper = getRoleDutyProfile('cd', 'Stopper');
      expect(cdStopper).toBeDefined();
      expect(cdStopper?.defensive.pressingIntensity).toBe('more_often');
      expect(cdStopper?.lockedPIs).toContain('close_down_more');

      const cdCover = getRoleDutyProfile('cd', 'Cover');
      expect(cdCover).toBeDefined();
      expect(cdCover?.lockedPIs).toContain('drop_deeper');
    });

    it('distinguishes attribute requirements and tactical movements between different duties of the same role', () => {
      const wcbDefend = getRoleDutyProfile('wcb', 'Defend')!;
      const wcbSupport = getRoleDutyProfile('wcb', 'Support')!;

      expect(wcbDefend).toBeDefined();
      expect(wcbSupport).toBeDefined();
      // Defend stays back, support advances and roams
      expect(wcbDefend.movement.depth).toBe('stay_back');
      expect(wcbSupport.movement.depth).toBe('balanced');
      expect(wcbSupport.movement.roaming).toBe(true);
      expect(wcbSupport.possession.progressionRole).toBe('carrier');
    });

    it('correctly validates compatible and incompatible role duties', () => {
      expect(isRoleDutyCompatible('bpd', 'Defend')).toBe(true);
      expect(isRoleDutyCompatible('anchor', 'Defend')).toBe(true);
      expect(isRoleDutyCompatible('ifb', 'Defend')).toBe(true);
      // Non-existent role or incompatible duty
      expect(isRoleDutyCompatible('fake_role', 'Attack')).toBe(false);
    });
  });

  // 2. Attribute Completeness & Confidence (No fake 10 fallback!)
  describe('Data Completeness & Confidence v2', () => {
    it('accurately reports completeness and penalizes confidence when attributes are missing', () => {
      const completePlayer: PlayerV2 = {
        id: 'p_full',
        name: 'Full Attributes Defender',
        positions: [{ position: 'DC', familiarity: 'Natural' }],
        attributes: {
          tackling: 16,
          marking: 15,
          heading: 15,
          positioning: 15,
          jumpingReach: 15,
          strength: 15,
          bravery: 14,
          composure: 14,
          concentration: 14,
          pace: 14,
        },
      };

      const partialPlayer: PlayerV2 = {
        id: 'p_partial',
        name: 'Partial Attributes Defender',
        positions: [{ position: 'DC', familiarity: 'Natural' }],
        attributes: {
          tackling: 16,
          marking: 15,
          // Missing all other key attributes!
        },
      };

      const cdProfile = getRoleDutyProfile('cd', 'Defend')!;
      const fullReport = evaluateDataCompleteness(
        completePlayer,
        cdProfile.keyAttributes,
        cdProfile.desirableAttributes
      );

      const partialReport = evaluateDataCompleteness(
        partialPlayer,
        cdProfile.keyAttributes,
        cdProfile.desirableAttributes
      );

      expect(fullReport.completenessScore).toBe(100);
      expect(fullReport.dataConfidence).toBe(100);
      expect(fullReport.missingKeyAttributes).toEqual([]);

      expect(partialReport.completenessScore).toBeLessThan(40);
      expect(partialReport.dataConfidence).toBeLessThan(50);
      expect(partialReport.missingKeyAttributes.length).toBeGreaterThan(0);
      expect(partialReport.missingKeyAttributes).toContain('heading');
    });

    it('does NOT default missing attributes to 10 in suitability calculation', () => {
      const emptyPlayer: PlayerV2 = {
        id: 'p_empty',
        name: 'Empty Attributes Player',
        positions: [{ position: 'STC', familiarity: 'Natural' }],
        attributes: {}, // All missing!
      };

      const afProfile = getRoleDutyProfile('af', 'Attack')!;
      const suitability = calculateRoleDutySuitabilityV2(emptyPlayer, afProfile, 'STC');

      // In v1, empty attributes defaulted to 10 giving ~50% score.
      // In v2, rawAttributeFit must be 0 and confidence severely penalized.
      expect(suitability.rawAttributeFit).toBe(0);
      expect(suitability.finalScore).toBe(0);
      expect(suitability.confidence).toBe(0);
      expect(suitability.negativeFactors.some(f => f.includes('Atribut kunci belum lengkap'))).toBe(true);
    });

    it('supports PositionalFamiliarity Unknown with 0.15 multiplier', () => {
      expect(getFamiliarityMultiplierV2('Natural')).toBe(1.0);
      expect(getFamiliarityMultiplierV2('Accomplished')).toBe(0.9);
      expect(getFamiliarityMultiplierV2('Competent')).toBe(0.7);
      expect(getFamiliarityMultiplierV2('Unconvincing')).toBe(0.5);
      expect(getFamiliarityMultiplierV2('Awkward')).toBe(0.3);
      expect(getFamiliarityMultiplierV2('Unknown')).toBe(0.15);
      expect(getFamiliarityMultiplierV2(undefined)).toBe(0.15);
    });
  });

  // 3. Deterministic Hashing & Stale State
  describe('Deterministic Hashing & Snapshot v2', () => {
    it('produces identical hash for identical tactic parameters', () => {
      const template = FORMATION_TEMPLATES[0];
      const slots = template.slots.map(s => ({ ...s, customPIs: [] }));

      const snapshot1 = createSimulationSnapshot(template.id, slots, DEFAULT_TEAM_INSTRUCTIONS);
      const snapshot2 = createSimulationSnapshot(template.id, slots, DEFAULT_TEAM_INSTRUCTIONS);

      expect(snapshot1.hash).toBe(snapshot2.hash);
      expect(isSnapshotStale(snapshot1, snapshot2)).toBe(false);
    });

    it('produces different hash and flags stale when tactic or instructions change', () => {
      const template = FORMATION_TEMPLATES[0];
      const slots1 = template.slots.map(s => ({ ...s, customPIs: [] }));
      const slots2 = template.slots.map(s => ({ ...s, customPIs: [] }));
      // Change one role
      slots2[10].roleId = 'dlf';

      const snapshot1 = createSimulationSnapshot(template.id, slots1, DEFAULT_TEAM_INSTRUCTIONS);
      const snapshot2 = createSimulationSnapshot(template.id, slots2, DEFAULT_TEAM_INSTRUCTIONS);

      expect(snapshot1.hash).not.toBe(snapshot2.hash);
      expect(isSnapshotStale(snapshot1, snapshot2)).toBe(true);
    });
  });

  // 4. Persistence & Safe Migration v1 to v2
  describe('Persistence & Migration v1 to v2', () => {
    it('successfully migrates valid v1 data into valid schema version 2', () => {
      const v1Data = {
        squadName: 'London Red',
        currentFormationId: '433_dm_wide',
        slots: FORMATION_TEMPLATES[0].slots.map(s => ({
          ...s,
          assignedPlayerId: 'p_1',
          customPIs: [],
        })),
        teamInstructions: {
          ...DEFAULT_TEAM_INSTRUCTIONS,
          mentality: 'attacking',
        },
        savedAt: 1727350000000,
      };

      const result = migrateV1ToV2(v1Data);
      expect(result.success).toBe(true);
      expect(result.recoveredFromV1).toBe(true);
      expect(result.state.schemaVersion).toBe(2);
      expect(result.state.currentFormationId).toBe('433_dm_wide');
      expect(result.state.slots.length).toBe(11);
      expect(result.state.teamInstructions.mentality).toBe('attacking');
      expect(result.state.players.length).toBeGreaterThan(0);
    });

    it('handles corrupted v1 data gracefully with default fallback and recovery error message', () => {
      const corruptedV1 = {
        slots: 'not an array',
        currentFormationId: null,
      };

      const result = migrateV1ToV2(corruptedV1);
      expect(result.success).toBe(false);
      expect(result.recoveredFromV1).toBe(false);
      expect(result.state.schemaVersion).toBe(2);
      expect(result.state.slots.length).toBe(11);
      expect(result.errorMessage).toBeDefined();
    });

    it('corrects unknown role IDs during migration with warnings', () => {
      const template = FORMATION_TEMPLATES[0];
      const v1Data = {
        squadName: 'London Red',
        currentFormationId: '433_dm_wide',
        slots: template.slots.map((s, idx) => ({
          ...s,
          roleId: idx === 0 ? 'unknown_space_cowboy_role' : s.roleId,
          customPIs: [],
        })),
        teamInstructions: DEFAULT_TEAM_INSTRUCTIONS,
      };

      const result = migrateV1ToV2(v1Data);
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('unknown_space_cowboy_role');
      // Replaced with standard GK role
      expect(result.state.slots[0].roleId).toBe('gk');
    });
  });
});
