"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="flex min-h-svh w-full">
      <div className="w-full max-w-[420px] px-6 py-10 mx-auto my-auto">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your internal account.
          </p>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitting(true);

            const formData = new FormData(event.currentTarget);
            formData.set("flow", "signIn");

            signIn("password", formData)
              .then(() => {
                router.push("/");
                router.refresh();
              })
              .catch((error) => {
                console.error(error);
                toast.error("Could not sign in");
                setSubmitting(false);
              });
          }}
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
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
              Password
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
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
