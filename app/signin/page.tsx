"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignInPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="flex min-h-svh w-full">
      <div className="w-full max-w-[420px] px-6 py-10 mx-auto my-auto">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Anmelden</h1>
          <p className="text-sm text-muted-foreground">
            Melde dich mit deinem internen Konto an.
          </p>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitting(true);

            const formData = new FormData(event.currentTarget);

            const email = String(formData.get("email") ?? "");
            const password = String(formData.get("password") ?? "");

            const supabase = getSupabaseBrowserClient();

            supabase.auth
              .signInWithPassword({ email, password })
              .then((result: { error: { message?: string } | null }) => {
                const { error } = result;
                if (error) {
                  throw error;
                }
                router.push("/");
                router.refresh();
              })
              .catch((error: unknown) => {
                console.error(error);
                const message =
                  error instanceof Error ? error.message : "Anmeldung fehlgeschlagen";
                toast.error(message);
                setSubmitting(false);
              });
          }}
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-Mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Passwort
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Anmelden…" : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}
