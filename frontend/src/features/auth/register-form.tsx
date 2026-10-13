"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { registerCompany } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { pickString } from "@/lib/normalize";
import { registerSchema, slugify, type RegisterValues } from "@/lib/schemas";

const FIELD_MAP: Record<string, keyof RegisterValues> = {
  company_name: "company_name",
  admin_email: "admin_email",
  admin_password: "admin_password",
  custom_slug: "custom_slug",
};

export function RegisterForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { company_name: "", admin_email: "", admin_password: "", confirm_password: "", custom_slug: "" },
  });

  const companyName = watch("company_name");
  const slugPlaceholder = slugify(companyName) || "acme";

  const mutation = useMutation({
    mutationFn: registerCompany,
    onSuccess: (data, vars) => {
      // Registration does NOT sign the administrator in; they continue to the login page.
      setCreatedSlug(pickString(data, ["company_slug", "slug", "custom_slug"]) ?? vars.custom_slug ?? "");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        for (const [field, msg] of Object.entries(err.fieldErrors)) {
          const key = FIELD_MAP[field];
          if (key) setError(key, { message: msg });
        }
        if (err.status === 409) {
          setFormError(`${err.message} Try a different company name or slug.`);
          return;
        }
        setFormError(err.message);
      } else {
        setFormError("Registration failed. Please try again.");
      }
    },
  });

  const onSubmit = handleSubmit((v) => {
    setFormError(null);
    mutation.mutate({
      company_name: v.company_name.trim(),
      admin_email: v.admin_email.trim(),
      admin_password: v.admin_password,
      ...(v.custom_slug.trim() ? { custom_slug: v.custom_slug.trim() } : {}),
    });
  });

  if (createdSlug !== null) {
    const loginHref = createdSlug ? `/login?registered=1&slug=${encodeURIComponent(createdSlug)}` : "/login?registered=1";
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-primary">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Company registered</h1>
          <p className="text-sm text-muted-foreground">
            Your company and administrator account were created. Sign in to open your workspace.
          </p>
          {createdSlug && (
            <p className="text-sm">
              Your company slug is <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{createdSlug}</code> — you&apos;ll need it each time you sign in.
            </p>
          )}
        </div>
        <Link href={loginHref} className={buttonStyles("primary", "lg", "w-full")}>
          Continue to sign in <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Register your company</h1>
        <p className="text-sm text-muted-foreground">Create a workspace and its first administrator account.</p>
      </div>

      {formError && <Alert tone="error">{formError}</Alert>}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Company name" htmlFor="company_name" error={errors.company_name?.message}>
          <Input id="company_name" autoComplete="organization" placeholder="Acme Inc." aria-invalid={!!errors.company_name} {...register("company_name")} />
        </Field>
        <Field
          label="Company slug"
          htmlFor="custom_slug"
          optional
          error={errors.custom_slug?.message}
          hint="A short, unique identifier used when signing in. Leave empty to let the system choose."
        >
          <Input id="custom_slug" autoCapitalize="none" spellCheck={false} placeholder={slugPlaceholder} aria-invalid={!!errors.custom_slug} {...register("custom_slug")} />
        </Field>
        <Field label="Administrator email" htmlFor="admin_email" error={errors.admin_email?.message}>
          <Input id="admin_email" type="email" autoComplete="email" placeholder="admin@company.com" aria-invalid={!!errors.admin_email} {...register("admin_email")} />
        </Field>
        <Field label="Administrator password" htmlFor="admin_password" error={errors.admin_password?.message} hint="At least 8 characters.">
          <PasswordInput id="admin_password" autoComplete="new-password" aria-invalid={!!errors.admin_password} {...register("admin_password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password" error={errors.confirm_password?.message}>
          <PasswordInput id="confirm_password" autoComplete="new-password" aria-invalid={!!errors.confirm_password} {...register("confirm_password")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
          {mutation.isPending ? "Creating company…" : "Create company"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
