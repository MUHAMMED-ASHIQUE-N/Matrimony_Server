import { z } from 'zod';

export const fullProfileSchema = z.object({
  body: z.object({
    // Basic
    firstName: z.string().min(2),
    lastName: z.string().optional(),
    contact: z.string().min(10),
    profileCreatedFor: z.enum(['Self', 'Son', 'Daughter', 'Sibling', 'Friend']),
    gender: z.enum(['Male', 'Female', 'Other']),
    
    // Personal
    dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid Date" }),
    height: z.string(), // "5.5 ft" -> needs parsing or send as cm
    weight: z.string(),
    caste: z.string().optional(),
    maritalStatus: z.string(),
    
    // Socio-Economic
    education: z.string(),
    presentCountry: z.string(),
    financialStatus: z.string(),
    
    // Arrays
    photos: z.array(z.string().url()).optional(), // Array of URLs
    hobbies: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    
    // Lifestyle
    dietPreference: z.string().optional(),
    smoking: z.string().optional(),
    drinking: z.string().optional(),
    
    // Partner Preferences (Ranges come as Arrays [min, max])
    ageRange: z.tuple([z.number(), z.number()]), 
    heightRange: z.tuple([z.number(), z.number()]), 
    maritalStatusPreference: z.string().optional(),
    religionPreference: z.string().optional(),
    distance: z.string().optional() // stored as number in DB
  }),
});