import { z } from 'zod';

// Reuseable Enums (Good for consistency)
const genderEnum = z.enum(['Male', 'Female', 'Other']);
const profileForEnum = z.enum(['Self', 'Son', 'Daughter', 'Sibling', 'Friend']);

export const fullProfileSchema = z.object({
  body: z.object({
    // Basic
    firstName: z.string().min(2),
    lastName: z.string().optional(),
    contact: z.string().min(10),
    profileCreatedFor: profileForEnum,
    gender: genderEnum,
    
    // Personal
    dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid Date" }),
    height: z.string(), // Frontend sends "175", stored as numeric
    weight: z.string(),
    caste: z.string().optional(),
    maritalStatus: z.string(),
    
    // Socio-Economic
    education: z.string(),
    presentCountry: z.string(),
    financialStatus: z.string(),
    
    // Arrays
    photos: z.array(z.string().url()).optional(),
    hobbies: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    
    // Lifestyle
    dietPreference: z.string().optional(),
    smoking: z.string().optional(),
    drinking: z.string().optional(),
    
    // Partner Preferences (Frontend sends Arrays [min, max])
    ageRange: z.tuple([z.number(), z.number()]).optional(), 
    heightRange: z.tuple([z.number(), z.number()]).optional(), 
    maritalStatusPreference: z.string().optional(),
    religionPreference: z.string().optional(),
    distance: z.string().optional()
  }),
});

// Update Schema: Everything is optional
// We use deepPartial to allow sending just { "firstName": "NewName" }
export const updateProfileSchema = fullProfileSchema.deepPartial();