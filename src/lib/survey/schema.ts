import { z } from 'zod';

const likertSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const geoLocationSchema = z.object({
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export const profileSchema = z.object({
  ageRange: z.enum(['18-24', '25-34', '35-44', '45-54', '55-64', '65+']),
  tenureType: z.enum(['buy', 'rent', 'not_sure']),
  budget: z.coerce.number().min(100, 'Budget must be at least 100'),
  householdType: z.enum(['alone', 'with_partner', 'with_family', 'house_share']),
});

export const commuteSchema = z
  .object({
    workLocation: geoLocationSchema.nullable(),
    daysPerWeek: z.coerce.number().min(0).max(5),
    maxCommuteTime: z.coerce.number().min(15).max(90),
    commuteTimeIsHardCap: z.boolean().default(true),
    commuteModes: z.array(z.enum(['drive', 'train', 'bus', 'cycle', 'walk'])),
  })
  .refine(
    (data) => data.daysPerWeek === 0 || data.commuteModes.length >= 1,
    {
      message: 'Select at least one commute mode if you commute',
      path: ['commuteModes'],
    }
  );

export const familySchema = z
  .object({
    householdSize: z.coerce.number().min(1).max(8),
    childrenStatus: z.enum(['no', 'under_5', 'school_age', 'both']),
    schoolPriority: z.enum(['primary', 'secondary', 'both', 'not_important']).nullable(),
    familyLocation: geoLocationSchema.nullable(),
    familyProximityImportance: likertSchema,
    socialImportance: likertSchema,
  })
  .refine(
    (data) =>
      data.childrenStatus === 'no' || data.schoolPriority !== null,
    {
      message: 'School priority is required when you have children',
      path: ['schoolPriority'],
    }
  );

export const lifestyleSchema = z.object({
  supermarkets: likertSchema,
  highStreet: likertSchema,
  pubsBars: likertSchema,
  restaurantsCafes: likertSchema,
  parksGreenSpaces: likertSchema,
  gymsLeisure: likertSchema,
  healthcare: likertSchema,
  librariesCulture: likertSchema,
});

export const transportSchema = z.object({
  carOwnership: z.enum(['yes', 'no', 'considering']),
  publicTransportReliance: likertSchema,
  trainStationImportance: likertSchema,
  cycleFrequency: z.enum(['yes', 'sometimes', 'no']),
  broadbandImportance: likertSchema,
});

export const environmentSchema = z.object({
  areaType: z.enum(['city_centre', 'inner_suburb', 'outer_suburb', 'town', 'rural']),
  peaceAndQuiet: likertSchema,
  greenSpaces: likertSchema,
  developmentFeeling: z.enum(['fine_with_it', 'prefer_established', 'no_preference']),
  excludeAreas: z.array(z.string()),
  consideringAreas: z.array(z.string()),
});
