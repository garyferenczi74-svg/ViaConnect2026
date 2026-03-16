import { z } from 'zod';

export const geneticStatusSchema = z.object({
  has_prior_testing: z.boolean().default(false),
  testing_provider: z.enum(['23andme', 'ancestry', 'genex360', 'clinical', 'other', 'none']).default('none'),
  testing_date: z.string().optional(),
  known_variants: z.array(z.object({
    gene: z.string(),
    variant: z.string(),
    significance: z.string().optional(),
  })).default([]),
  interested_in_testing: z.boolean().default(true),
  raw_data_available: z.boolean().default(false),
  concerns: z.array(z.string()).default([]),
});

export type GeneticStatus = z.infer<typeof geneticStatusSchema>;
