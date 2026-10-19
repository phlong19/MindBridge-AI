"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2, Plus, Search } from "lucide-react";
import type { CompanionRow } from "@/types";
import { getWorkspaceCompanions } from "@/lib/services/companion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import CompanionAvatar from "./CompanionAvatar";

export type NavigationData = {
  companions: CompanionRow[];
  count: number;
  error: boolean;
  saved: CompanionRow[];
  savedError: boolean;
};

export default function CompanionSidebar({
  current,
  initial,
  locked,
  isNavigationLocked,
  onNavigate,
}: {
  current: CompanionRow | null;
  initial: NavigationData;
  locked: boolean;
  isNavigationLocked?: () => boolean;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(initial.companions);
  const [count, setCount] = useState(initial.count);
  const [page, setPage] = useState(1);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initial.error);
  const requestId = useRef(0);
  const alive = useRef(true);
  const term = search.trim().toLocaleLowerCase();
  const matches = (companion: CompanionRow) =>
    `${companion.name ?? ""} ${companion.topic ?? ""}`
      .toLocaleLowerCase()
      .includes(term);
  const ownIds = new Set(items.map((item) => item.id));
  const saved = initial.saved.filter(
    (item, index, all) =>
      !ownIds.has(item.id) &&
      all.findIndex((other) => other.id === item.id) === index &&
      matches(item),
  );
  const showCurrent =
    current &&
    !ownIds.has(current.id) &&
    !saved.some((item) => item.id === current.id) &&
    matches(current);

  async function load(query: string, nextPage: number, id: number) {
    setLoading(true);
    setError(false);
    try {
      const result = await getWorkspaceCompanions(query, nextPage);
      if (!alive.current || id !== requestId.current) return;
      if ("error" in result) throw new Error(result.error);
      setItems((previous) =>
        nextPage === 1
          ? result.data
          : [
              ...new Map(
                [...previous, ...result.data].map((item) => [item.id, item]),
              ).values(),
            ],
      );
      setCount(result.count);
      setPage(nextPage);
      setLoadedQuery(query);
    } catch {
      if (alive.current && id === requestId.current) setError(true);
    } finally {
      if (alive.current && id === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    if (!search.trim()) {
      setItems(initial.companions);
      setCount(initial.count);
      setPage(1);
      setLoadedQuery("");
      setError(initial.error);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void load(search, 1, id);
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [search, initial.companions, initial.count, initial.error]);

  function row(companion: CompanionRow) {
    const selected = current?.id === companion.id;
    return (
      <Link
        key={companion.id}
        href={`/companions/${companion.id}`}
        aria-current={selected ? "page" : undefined}
        aria-disabled={locked}
        tabIndex={locked ? -1 : undefined}
        onClick={(event) => {
          if (locked || isNavigationLocked?.()) event.preventDefault();
          else onNavigate?.();
        }}
        className={cn(
          "focus-visible:ring-primary flex min-w-0 items-center gap-3 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
          selected ? "bg-[#ffede4]" : "hover:bg-muted/70",
          locked && "cursor-not-allowed",
        )}
        title={
          locked
            ? t("End the current session before switching companions")
            : (companion.name ?? t("Companion"))
        }
      >
        <CompanionAvatar
          key={companion.id}
          companion={companion}
          className="size-11 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{companion.name}</span>
          <span className="text-muted-foreground mt-1 block truncate text-xs">
            {companion.topic || t(companion.subject ?? "")}
          </span>
        </span>
        {selected && (
          <span
            className="bg-primary size-1.5 shrink-0 rounded-full"
            aria-hidden="true"
          />
        )}
      </Link>
    );
  }

  return (
    <nav
      className="flex h-full min-h-0 flex-col"
      aria-label={t("Learning companions")}
    >
      <div className="shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">
            <LocalizedText>My Companions</LocalizedText>
          </h2>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:text-primary rounded-xl hover:bg-[#ffede4]"
          >
            <Link
              href="/companions/new"
              aria-disabled={locked}
              tabIndex={locked ? -1 : undefined}
              onClick={(event) => {
                if (locked || isNavigationLocked?.()) event.preventDefault();
              }}
            >
              <Plus className="size-4" />
              <LocalizedText>New</LocalizedText>
            </Link>
          </Button>
        </div>
        <label className="border-border/60 bg-muted/60 focus-within:ring-primary/40 mt-5 flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">
            <LocalizedText>Search your companions</LocalizedText>
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search companions…")}
            maxLength={200}
            className="placeholder:text-muted-foreground w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4" aria-busy={loading}>
        {error ? (
          <div className="px-5 py-3 text-sm">
            <p className="text-muted-foreground">
              <LocalizedText>Could not load your companions.</LocalizedText>
            </p>
            <Button
              variant="link"
              className="px-0"
              disabled={loading}
              onClick={() => {
                void load(search, 1, ++requestId.current);
              }}
            >
              <LocalizedText>Retry</LocalizedText>
            </Button>
          </div>
        ) : (
          <>
            {items.map(row)}
            {!items.length && !loading && (
              <p className="text-muted-foreground px-5 py-4 text-sm">
                {term
                  ? t("No matching companions.")
                  : t("Create your first learning companion.")}
              </p>
            )}
          </>
        )}
        {loading && (
          <p
            role="status"
            className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-xs"
          >
            <Loader2 className="size-4 animate-spin" />
            <LocalizedText>Loading companions…</LocalizedText>
          </p>
        )}
        {!error && items.length < count && (
          <Button
            variant="ghost"
            size="sm"
            className="mx-5 mt-2"
            disabled={loading || loadedQuery !== search}
            onClick={() => {
              void load(search, page + 1, ++requestId.current);
            }}
          >
            <LocalizedText>Load more</LocalizedText>
          </Button>
        )}
        {saved.length > 0 && (
          <>
            <h3 className="text-muted-foreground px-5 pt-6 pb-2 text-xs font-semibold tracking-wide">
              <LocalizedText>Saved companions</LocalizedText>
            </h3>
            {saved.map(row)}
          </>
        )}
        {initial.savedError && (
          <p className="text-muted-foreground px-5 py-3 text-xs">
            <LocalizedText>Saved companions are unavailable.</LocalizedText>{" "}
            <Link href="/profile/my-journey" className="text-primary underline">
              <LocalizedText>Open My Journey</LocalizedText>
            </Link>
          </p>
        )}
        {showCurrent && (
          <>
            <h3 className="text-muted-foreground px-5 pt-6 pb-2 text-xs font-semibold tracking-wide">
              <LocalizedText>Current companion</LocalizedText>
            </h3>
            {row(current)}
          </>
        )}
      </div>
      <div className="border-border/60 shrink-0 border-t px-5 py-4">
        {locked ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            <LocalizedText>
              End your session before switching companions.
            </LocalizedText>
          </p>
        ) : (
          <Link
            href="/profile/my-journey"
            className="text-muted-foreground hover:text-primary flex items-center justify-between text-xs"
          >
            <LocalizedText>My learning journey</LocalizedText>{" "}
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
    </nav>
  );
}
