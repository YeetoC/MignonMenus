"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogStickyFooter } from "@/sticky_footer_dialog"
import { copyTextToClipboard } from "@/lib/clipboard"
import { centsToEurosString, eurosStringToCents } from "@/lib/money"

export default function Sprint1DevPage() {
  const [textToCopy, setTextToCopy] = React.useState("Sample menu content")
  const [euros, setEuros] = React.useState("12.50")

  const cents = React.useMemo(() => eurosStringToCents(euros), [euros])

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Sprint 1 Harness</h1>
        <p className="text-sm text-muted-foreground">
          Dialog + toast + clipboard + money helpers.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Dialog (sticky footer)</h2>
        <DialogStickyFooter />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Clipboard helper + toast</h2>
        <div className="flex flex-col gap-2 max-w-md">
          <Input value={textToCopy} onChange={(e) => setTextToCopy(e.target.value)} />
          <div>
            <Button
              onClick={async () => {
                const ok = await copyTextToClipboard(textToCopy)
                if (ok) {
                  toast.success("Copied")
                } else {
                  toast.error("Copy failed")
                }
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Money helpers</h2>
        <div className="flex flex-col gap-2 max-w-md">
          <Input value={euros} onChange={(e) => setEuros(e.target.value)} />
          <div className="text-sm text-muted-foreground">
            {cents === null ? (
              <span>Invalid EUR input</span>
            ) : (
              <span>
                cents: <span className="text-foreground font-medium">{cents}</span> | formatted: {" "}
                <span className="text-foreground font-medium">{centsToEurosString(cents)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
