"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function Sprint2DevPage() {
  const [loading, setLoading] = React.useState(true);
  const [userJson, setUserJson] = React.useState<string>("");

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getUser()
      .then(
        (result: {
          data: { user: unknown };
          error: { message?: string } | null;
        }) => {
          const { data, error } = result;
          if (error) {
            throw error;
          }
          setUserJson(JSON.stringify(data.user, null, 2));
        },
      )
      .catch((error: unknown) => {
        console.error(error);
        setUserJson(
          JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          ),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Sprint 2 Harness</h1>
        <p className="text-sm text-muted-foreground">
          Supabase Auth client + session cookies.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">Current user</div>
            <pre className="text-xs overflow-auto">{userJson}</pre>
          </div>

          <div>
            <Button
              variant="outline"
              onClick={() => {
                const supabase = getSupabaseBrowserClient();
                supabase.auth.signOut().then(() => {
                  window.location.href = "/signin";
                });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
