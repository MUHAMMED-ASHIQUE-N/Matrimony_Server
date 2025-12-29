import { z } from 'zod';

// Reuseable enums and patterns
const typeEnum = z.enum(['EMAIL', 'PHONE'], {
  errorMap: () => ({ message: "Type must be 'EMAIL' or 'PHONE'" })
});

// 1. Signup Schema (Identifier + Type + Password)
export const signupSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, "Identifier is required"), // Email or Phone string
    type: typeEnum,
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});

// 2. Verify OTP Schema (Identifier + Type + OTP)
export const verifyOtpSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, "Identifier is required"),
    type: typeEnum,
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
  }),
});

// 3. Login Schema (Identifier + Type + Password)
export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, "Identifier is required"),
    type: typeEnum,
    password: z.string().min(1, "Password is required"),
  }),
});

// 4. Set Password Schema (Only password, since user is already auth via temp token)
// Note: Kept for reference if you add a "Forgot Password" flow later
export const setPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});