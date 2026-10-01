import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Email address is too long.");

export const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(72, "Password is too long.");

export const fullNameSchema = z.string().trim().min(1, "Enter your full name.").max(120, "Full name is too long.");

export const ACCOUNT_TYPES = ["individual", "business"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Kosovo business NUI: digits and letters, 6-10 characters after trimming. */
export const businessNuiSchema = z
  .string()
  .trim()
  .min(6, "Enter your business NUI (at least 6 characters).")
  .max(10, "Business NUI is too long.")
  .regex(/^[A-Za-z0-9]+$/, "Business NUI can only contain letters and numbers.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

/**
 * Individual signup stays exactly email/password(+profile fields); business
 * signup additionally requires the business NUI, selected via accountType.
 */
export const signUpSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(ACCOUNT_TYPES).default("individual"),
    businessNui: z.string().trim().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.accountType !== "business" || (values.businessNui != null && businessNuiSchema.safeParse(values.businessNui).success), {
    message: "Enter your business NUI to complete business registration.",
    path: ["businessNui"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
