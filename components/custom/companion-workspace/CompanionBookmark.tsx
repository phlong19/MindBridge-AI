"use client";

import { useRef, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CompanionRow } from "@/types";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/provider";
import {
  getCompanionBookmarkStatus,
  savedBookmark,
} from "@/lib/services/bookmarks";
import { useCompanionWorkspaceShell } from "./CompanionWorkspaceShell";

export default function CompanionBookmark({
  companion,
  initialBookmarked,
}: {
  companion: CompanionRow;
  initialBookmarked: boolean | null;
}) {
  const { t } = useI18n();
  const { updateBookmark, getBookmarkState } = useCompanionWorkspaceShell();
  const [loadedStatus, setLoadedStatus] = useState(initialBookmarked);
  const bookmarked = getBookmarkState(companion.id, loadedStatus);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const label =
    bookmarked === null
      ? t("Retry loading bookmark")
      : bookmarked
        ? t("Remove bookmark")
        : t("Add bookmark");

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      if (bookmarked === null) {
        const status = await getCompanionBookmarkStatus(companion.id);
        if (status === null) throw new Error("Bookmark unavailable");
        setLoadedStatus(status);
        updateBookmark(companion, status);
        return;
      }
      const result = await savedBookmark(companion.id);
      if (result.type !== "success" || result.bookmarked === undefined) {
        toast.error(t(result.title));
        return;
      }
      setLoadedStatus(result.bookmarked);
      updateBookmark(companion, result.bookmarked);
      toast.success(t(result.title));
    } catch {
      toast.error(
        t(
          "Something went wrong while saving your bookmark. Please try again later.",
        ),
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 rounded-xl"
      aria-label={label}
      title={label}
      aria-pressed={bookmarked === true}
      aria-busy={pending}
      disabled={pending}
      onClick={() => void toggle()}
    >
      {pending ? (
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <Bookmark
          className="size-4"
          fill={bookmarked ? "currentColor" : "none"}
          aria-hidden="true"
        />
      )}
    </Button>
  );
}
