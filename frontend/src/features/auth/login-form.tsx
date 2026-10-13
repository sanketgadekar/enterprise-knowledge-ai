"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { login } from "@/lib/api-client";
import { loginErrorMessage } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { safeNextPath } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { company_slug: params.get("slug") ?? "", email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      qc.clear();
      toast.success(`Signed in to ${data.company_slug || "your workspace"}`);
      router.replace(safeNextPath(params.get("next")));
      router.refresh();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) {
        for (const [field, msg] of Object.entries(err.fieldErrors)) {
          if (field === "company_slug" || field === "email" || field === "password") setError(field, { message: msg });
        }
      }
      setFormError(loginErrorMessage(err));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate({ ...values, company_slug: values.company_slug.trim(), email: values.email.trim() });
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use your company slug and work email to continue.</p>
      </div>

      {params.get("registered") && !formError && (
        <Alert tone="success" title="Company registered">
          Sign in with the administrator account you just created.
        </Alert>
      )}
      {params.get("expired") && !formError && (
        <Alert tone="warning" title="Your session expired">
          Please sign in again to continue.
        </Alert>
      )}
      {formError && <Alert tone="error">{formError}</Alert>}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Company slug" htmlFor="company_slug" error={errors.company_slug?.message} hint="The short identifier chosen when your company was registered.">
          <Input
            id="company_slug"
            autoComplete="organization"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="acme"
            aria-invalid={!!errors.company_slug}
            aria-describedby={errors.company_slug ? "company_slug-error" : "company_slug-hint"}
            {...register("company_slug")}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to Enterprise Knowledge AI?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-2 hover:underline">
          Register your company
        </Link>
      </p>
    </div>
  );
}
