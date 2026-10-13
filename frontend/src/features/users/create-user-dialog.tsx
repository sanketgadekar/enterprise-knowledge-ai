"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createUser } from "@/lib/api-client";
import { permissionMessage } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { createUserSchema, type CreateUserValues } from "@/lib/schemas";

export function CreateUserDialog({
  open,
  onClose,
  roleSuggestions,
}: {
  open: boolean;
  onClose: () => void;
  roleSuggestions: string[];
}) {
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const listId = React.useId();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", password: "", role: "" },
  });

  React.useEffect(() => {
    if (!open) {
      reset();
      setFormError(null);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (_d, vars) => {
      toast.success(`User ${vars.email} created`);
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        for (const [f, msg] of Object.entries(err.fieldErrors)) {
          if (f === "email" || f === "password" || f === "role") setError(f, { message: msg });
        }
      }
      setFormError(permissionMessage(err, "add users"));
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add a user" description="They'll sign in with your company slug and these credentials.">
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          mutation.mutate({ email: v.email.trim(), password: v.password, role: v.role.trim() });
        })}
      >
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Email" htmlFor="new-email" error={errors.email?.message}>
          <Input id="new-email" type="email" autoComplete="off" placeholder="colleague@company.com" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Temporary password" htmlFor="new-password" error={errors.password?.message} hint="At least 8 characters. Share it with the user securely.">
          <PasswordInput id="new-password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field
          label="Role"
          htmlFor="new-role"
          error={errors.role?.message}
          hint={roleSuggestions.length ? "Pick a suggested role or type one. Accepted roles are decided by the backend." : "Accepted roles are decided by the backend (for example: admin)."}
        >
          <Input id="new-role" list={listId} autoComplete="off" autoCapitalize="none" placeholder="admin" aria-invalid={!!errors.role} {...register("role")} />
          <datalist id={listId}>
            {roleSuggestions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
