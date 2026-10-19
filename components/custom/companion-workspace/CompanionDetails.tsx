"use client";

import { useId, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock3,
  GraduationCap,
  Mic,
  NotebookText,
  SlidersHorizontal,
} from "lucide-react";
import type { CompanionRow } from "@/types";
import { cn } from "@/lib/utils";
import LearningRecapPanel from "./LearningRecapPanel";
import CompanionAvatar from "./CompanionAvatar";
import type { CompanionSessionState } from "./useCompanionSession";

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      {icon}
      <div className="min-w-0">
        <dt className="mb-1 text-xs font-semibold">{label}</dt>
        <dd className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </dd>
      </div>
    </div>
  );
}

export default function CompanionDetails({
  companion,
  voiceName,
  session,
}: {
  companion: CompanionRow;
  voiceName: string | null;
  session: CompanionSessionState;
}) {
  const [tab, setTab] = useState<"about" | "settings">("about");
  const id = useId();
  const iconClass = "mt-0.5 size-5 shrink-0";
  const created = new Date(companion.created_at);
  const createdLabel = Number.isNaN(created.getTime())
    ? "Unavailable"
    : created.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      });
  return (
    <aside
      className="flex h-full min-h-0 flex-col"
      aria-label="Companion details"
    >
      <div
        role="tablist"
        aria-label="Companion information"
        className="border-border/60 grid shrink-0 grid-cols-2 border-b px-3"
      >
        {(["about", "settings"] as const).map((value) => (
          <button
            key={value}
            id={`${id}-${value}`}
            role="tab"
            aria-selected={tab === value}
            aria-controls={`${id}-panel`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "about"
                    : event.key === "End"
                      ? "settings"
                      : tab === "about"
                        ? "settings"
                        : "about";
                setTab(next);
                document.getElementById(`${id}-${next}`)?.focus();
              }
            }}
            className={cn(
              "focus-visible:ring-primary border-b-2 px-3 py-3 text-sm capitalize transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
              tab === value
                ? "border-primary text-primary"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        tabIndex={0}
        className="focus-visible:outline-primary min-h-0 flex-1 space-y-4 overflow-y-auto p-3"
      >
        {tab === "about" ? (
          <>
            <div className="flex flex-col items-center gap-3 py-3">
              <CompanionAvatar
                companion={companion}
                className="size-40 rounded-3xl"
                alt={`Avatar for ${companion.name}`}
                sizes="160px"
              />
              <p className="w-full text-center text-lg font-semibold break-words">
                {companion.name}
              </p>
            </div>
            <section className="bg-muted/60 rounded-2xl p-5">
              <h3 className="mb-2 font-bold">Overview</h3>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {companion.topic ||
                  `Learn and practice ${companion.subject ?? "your chosen topic"}.`}
              </p>
              <dl className="space-y-6">
                <Detail
                  icon={<GraduationCap className={iconClass} />}
                  label="Category"
                >
                  <span className="capitalize">{companion.subject}</span>
                </Detail>
                <Detail
                  icon={<NotebookText className={iconClass} />}
                  label="Topic"
                >
                  {companion.topic || "Not specified"}
                </Detail>
                <Detail icon={<Mic className={iconClass} />} label="Voice">
                  {voiceName ?? "Voice unavailable"}
                </Detail>
                <Detail
                  icon={<CalendarDays className={iconClass} />}
                  label="Created"
                >
                  {createdLabel}
                </Detail>
              </dl>
            </section>
            <LearningRecapPanel session={session} />
          </>
        ) : (
          <section className="bg-muted/60 rounded-2xl p-5">
            <h3 className="mb-2 font-bold">Configuration</h3>
            <p className="text-muted-foreground mb-6 text-xs leading-relaxed">
              Your companion’s current learning preferences.
            </p>
            <dl className="space-y-6">
              <Detail icon={<Mic className={iconClass} />} label="Voice">
                {voiceName ?? "Voice unavailable"}
              </Detail>
              <Detail
                icon={<SlidersHorizontal className={iconClass} />}
                label="Tone"
              >
                {companion.style ? "Formal" : "Casual"}
              </Detail>
              <Detail
                icon={<GraduationCap className={iconClass} />}
                label="Voice gender"
              >
                {companion.gender ? "Male" : "Female"}
              </Detail>
              <Detail
                icon={<Clock3 className={iconClass} />}
                label="Voice session limit"
              >
                {companion.duration ?? 10} minutes
              </Detail>
            </dl>
          </section>
        )}
      </div>
    </aside>
  );
}
