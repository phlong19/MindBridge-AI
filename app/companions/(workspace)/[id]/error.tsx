"use client";

import { Button } from "@/components/ui/Button";

export default function CompanionPanelError({ reset }: { reset: () => void }) {
  return (
    <section
      role="alert"
      className="border-border/40 flex min-h-0 flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-6 text-center xl:col-span-2"
    >
      <h2 className="font-semibold">Could not load this companion</h2>
      <p className="text-muted-foreground text-sm">
        Try again or choose another companion from the list.
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </section>
  );
}
