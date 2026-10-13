import { describe, expect, it } from "vitest";
import { createUserSchema, loginSchema, registerSchema, slugify } from "./schemas";
import { safeNextPath } from "./utils";

describe("loginSchema", () => {
  it("requires all three fields and a valid email", () => {
    expect(loginSchema.safeParse({ company_slug: "", email: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ company_slug: "acme", email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ company_slug: "acme", email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("registerSchema", () => {
  const base = { company_name: "Acme", admin_email: "a@b.co", admin_password: "longenough", confirm_password: "longenough", custom_slug: "" };
  it("accepts an empty optional slug", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });
  it("rejects mismatched passwords and short passwords", () => {
    expect(registerSchema.safeParse({ ...base, confirm_password: "different1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, admin_password: "short", confirm_password: "short" }).success).toBe(false);
  });
  it("rejects slugs containing spaces", () => {
    expect(registerSchema.safeParse({ ...base, custom_slug: "my co" }).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("requires email, password and role", () => {
    expect(createUserSchema.safeParse({ email: "a@b.co", password: "longenough", role: "admin" }).success).toBe(true);
    expect(createUserSchema.safeParse({ email: "a@b.co", password: "longenough", role: "" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("slugify", () => expect(slugify("  Acme Inc. & Sons! ")).toBe("acme-inc-sons"));
  it("safeNextPath blocks open redirects", () => {
    expect(safeNextPath("/chat?session=1")).toBe("/chat?session=1");
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("/api/session")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});
