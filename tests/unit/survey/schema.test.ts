import { describe, it, expect } from 'vitest';
import {
  profileSchema,
  commuteSchema,
  familySchema,
  environmentSchema,
} from '@/lib/survey/schema';

describe('survey schema validation', () => {
  describe('profileSchema', () => {
    it('passes for valid budget', () => {
      const valid = profileSchema.safeParse({
        ageRange: '25-34',
        tenureType: 'buy',
        budget: 100,
        householdType: 'alone',
      });
      expect(valid.success).toBe(true);
    });

    it('fails if budget < 100', () => {
      const invalid = profileSchema.safeParse({
        ageRange: '25-34',
        tenureType: 'buy',
        budget: 99,
        householdType: 'alone',
      });
      expect(invalid.success).toBe(false);
    });

    it('fails on invalid age range', () => {
      const invalid = profileSchema.safeParse({
        ageRange: '0-10',
        tenureType: 'buy',
        budget: 1000,
        householdType: 'alone',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('commuteSchema', () => {
    const baseCommute = {
      workLocation: null,
      maxCommuteTime: 45,
      commuteTimeIsHardCap: true,
      remoteRegion: null,
    };

    it('passes if daysPerWeek is 0 and commuteModes is empty', () => {
      const valid = commuteSchema.safeParse({
        ...baseCommute,
        daysPerWeek: 0,
        commuteModes: [],
      });
      expect(valid.success).toBe(true);
    });

    it('fails if daysPerWeek > 0 and commuteModes is empty', () => {
      const invalid = commuteSchema.safeParse({
        ...baseCommute,
        daysPerWeek: 1,
        commuteModes: [],
      });
      expect(invalid.success).toBe(false);
    });

    it('fails if maxCommuteTime < 15', () => {
      const invalid = commuteSchema.safeParse({
        ...baseCommute,
        daysPerWeek: 0,
        commuteModes: [],
        maxCommuteTime: 14,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('familySchema', () => {
    const baseFamily = {
      householdSize: 2,
      familyLocation: null,
      familyProximityImportance: 3,
      socialImportance: 3,
    };

    it('passes if childrenStatus is no and schoolPriority is null', () => {
      const valid = familySchema.safeParse({
        ...baseFamily,
        childrenStatus: 'no',
        schoolPriority: null,
      });
      expect(valid.success).toBe(true);
    });

    it('fails if childrenStatus is not no and schoolPriority is null', () => {
      const invalid = familySchema.safeParse({
        ...baseFamily,
        childrenStatus: 'school_age',
        schoolPriority: null,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('environmentSchema', () => {
    it('passes for valid areaTypes', () => {
      const valid = environmentSchema.safeParse({
        areaTypes: ['city_centre', 'rural'],
        peaceAndQuiet: 3,
        greenSpaces: 3,
        excludeAreas: [],
        consideringAreas: [],
      });
      expect(valid.success).toBe(true);
    });

    it('fails for invalid areaTypes', () => {
      const invalid = environmentSchema.safeParse({
        areaTypes: ['space_station'],
        peaceAndQuiet: 3,
        greenSpaces: 3,
        excludeAreas: [],
        consideringAreas: [],
      });
      expect(invalid.success).toBe(false);
    });
  });
});
