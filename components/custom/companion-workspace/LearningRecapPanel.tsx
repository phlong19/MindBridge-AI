"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CompanionSessionState } from "./useCompanionSession";

export default function LearningRecapPanel({
  session,
}: {
  session: CompanionSessionState;
}) {
  if (!session.recap && !session.recapSessionId) return null;
  return (
    <section
      className="border-primary/15 rounded-2xl border bg-[#fff8f3] p-4"
      aria-label="Learning recap"
    >
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Sparkles className="text-primary size-4" />
        {session.recap ? "Learning recap" : "Create a learning recap?"}
      </h3>
      {session.recap ? (
        <div className="space-y-4 text-sm leading-relaxed">
          <p>{session.recap.summary}</p>
          {(
            [
              ["Topics covered", session.recap.topicsLearned],
              ["What went well", session.recap.strengths],
              ["Try next", session.recap.tryNext],
            ] as const
          ).map(
            ([title, entries]) =>
              entries.length > 0 && (
                <div key={title}>
                  <h4 className="mb-1 font-medium">{title}</h4>
                  <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                    {entries.map((entry, index) => (
                      <li key={index}>{entry}</li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
            Generate a summary of what you covered and what to practice next.
            Your saved call is analyzed only when you choose Generate.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={
                session.generatingRecap ||
                session.busy ||
                session.callStatus !== "idle" ||
                session.unsavedVoice
              }
              onClick={() => {
                void session.generateRecap();
              }}
            >
              {session.generatingRecap && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {session.generatingRecap ? "Generating…" : "Generate"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={session.generatingRecap}
              onClick={session.dismissRecap}
            >
              Not now
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
