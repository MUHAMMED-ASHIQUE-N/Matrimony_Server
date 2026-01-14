import { z } from 'zod';

// Reuseable Enums (Good for consistency)
const genderEnum = z.enum(['Male', 'Female', 'Other']);
const profileForEnum = z.enum(['Self', 'Son', 'Daughter', 'Sibling', 'Friend']);

// Basic Profile Schema (for initial profile creation)
export const basicProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().optional(),
    gender: genderEnum,
    profileCreatedFor: profileForEnum,
  }),
});


export const fullProfileSchema = z.object({
  body: z.object({
    // Basic
    firstName: z.string().min(2),
    lastName: z.string().optional(),
    contact: z.string().min(10),
    profileCreatedFor: profileForEnum,
    gender: genderEnum,


    // NEW FIELDS
    tagline: z.string().optional(),
    religion: z.string().optional(),
    motherTongue: z.string().optional(),

    // Education & Career
    college: z.string().optional(),
    passoutYear: z.union([z.string(), z.number()]).optional(), // Accepts "2020" or 2020
    occupation: z.string().optional(),
    company: z.string().optional(),
    annualIncome: z.string().optional(),

    // Personal
    dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid Date" }),
    height: z.string(), // Frontend sends "175", stored as numeric
    weight: z.string(),
    caste: z.string().optional(),
    maritalStatus: z.string(),
    aboutMe: z.string().max(1000).optional(),

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