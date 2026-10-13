import { z } from "zod";

/**
 * Client-side form validation.
 *
 * The Swagger page shows field names/types but NOT backend constraints (min length,
 * slug pattern, role values). The rules below are conservative client-side conventions
 * only; the backend remains authoritative and its error messages are shown verbatim.
 */
export const loginSchema = z.object({
  company_slug: z.string().trim().min(1, "Enter your company slug"),
  email: z.string().trim().min(1, "Enter your email").pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    company_name: z.string().trim().min(2, "Enter your company name"),
    admin_email: z.string().trim().min(1, "Enter an administrator email").pipe(z.email("Enter a valid email address")),
    admin_password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm the password"),
    custom_slug: z
      .string()
      .trim()
      .refine((v) => v === "" || (v.length >= 2 && v.length <= 64), "Use 2–64 characters")
      .refine((v) => !/\s/.test(v), "No spaces — try lowercase letters, numbers and hyphens"),
  })
  .refine((v) => v.admin_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const createUserSchema = z.object({
  email: z.string().trim().min(1, "Enter an email").pipe(z.email("Enter a valid email address")),
  password: z.string().min(8, "Use at least 8 characters"),
  role: z.string().trim().min(1, "Enter a role").refine((v) => !/\s/.test(v), "Roles cannot contain spaces"),
});
export type CreateUserValues = z.infer<typeof createUserSchema>;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
