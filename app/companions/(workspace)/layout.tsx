import type { ReactNode } from "react";
import { currentUser } from "@clerk/nextjs/server";
import type { CompanionRow } from "@/types";
import CompanionWorkspaceShell from "@/components/custom/companion-workspace/CompanionWorkspaceShell";
import { getWorkspaceCompanions } from "@/lib/services/companion";
import { getAllCompanionsFromBookmark } from "@/lib/services/bookmarks";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await currentUser();
  // The detail page redirects with its companion ID if middleware did not.
  if (!user) return children;
  const [ownedResult, savedResult] = await Promise.allSettled([
    getWorkspaceCompanions(),
    getAllCompanionsFromBookmark(user.id),
  ]);
  const owned = ownedResult.status === "fulfilled" ? ownedResult.value : null;
  const saved =
    savedResult.status === "fulfilled" && Array.isArray(savedResult.value)
      ? savedResult.value.filter((entry): entry is CompanionRow =>
          Boolean(entry),
        )
      : [];
  return (
    <CompanionWorkspaceShell
      navigation={{
        companions: owned && "data" in owned ? (owned.data ?? []) : [],
        count: owned && "count" in owned ? (owned.count ?? 0) : 0,
        error: !owned || "error" in owned,
        saved,
        savedError:
          savedResult.status !== "fulfilled" ||
          !Array.isArray(savedResult.value),
      }}
    >
      {children}
    </CompanionWorkspaceShell>
  );
}
