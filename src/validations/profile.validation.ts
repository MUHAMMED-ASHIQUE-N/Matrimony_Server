import { z } from 'zod';

export const createProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2),
    lastName: z.string().optional(),
    contact: z.string().min(10),
    gender: z.enum(['Male', 'Female', 'Other']),
    dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date format",
    }),
    
    // Physical & Social
    height: z.number().positive(),
    weight: z.number().positive(),
    caste: z.string(),
    maritalStatus: z.string(),
    education: z.string(),
    presentCountry: z.string(),
    financialStatus: z.string(),
    
    // Arrays
    photos: z.array(z.string().url()).optional(),
    hobbies: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    
    // Preferences
    ageRange: z.object({ min: z.number(), max: z.number() }),
    heightRange: z.object({ min: z.number(), max: z.number() }),
    maritalStatusPreference: z.string(),
    religionPreference: z.string(),
    dietPreference: z.string(),
    smoking: z.string(),
    drinking: z.string(),
    distance: z.number().optional()
  }),
});

export const updateProfileSchema = createProfileSchema.deepPartial();