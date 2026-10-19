"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useParams } from "next/navigation";
import type { CompanionRow } from "@/types";
import CompanionSidebar, { type NavigationData } from "./CompanionSidebar";

type WorkspaceContext = {
  navigation: NavigationData;
  updateBookmark: (companion: CompanionRow, bookmarked: boolean) => void;
  getBookmarkState: (id: string, initial: boolean | null) => boolean | null;
  setCurrentCompanion: Dispatch<SetStateAction<CompanionRow | null>>;
  setLocked: Dispatch<SetStateAction<boolean>>;
  registerNavigationGuard: (guard: () => boolean) => () => void;
};

const WorkspaceContext = createContext<WorkspaceContext | null>(null);

export function useCompanionWorkspaceShell() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Companion panels require a workspace shell.");
  return context;
}

export default function CompanionWorkspaceShell({
  navigation,
  children,
}: {
  navigation: NavigationData;
  children: ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const [currentCompanion, setCurrentCompanion] = useState<CompanionRow | null>(
    null,
  );
  const [locked, setLocked] = useState(false);
  const [bookmarkChanges, setBookmarkChanges] = useState<
    Record<string, CompanionRow | null>
  >({});
  const updateBookmark = useCallback(
    (companion: CompanionRow, bookmarked: boolean) => {
      setBookmarkChanges((previous) => ({
        ...previous,
        [companion.id]: bookmarked ? companion : null,
      }));
    },
    [],
  );
  const currentNavigation = useMemo(
    () => ({
      ...navigation,
      saved: [
        ...navigation.saved.filter(
          (companion) => !(companion.id in bookmarkChanges),
        ),
        ...Object.values(bookmarkChanges).filter(
          (companion): companion is CompanionRow => companion !== null,
        ),
      ],
    }),
    [navigation, bookmarkChanges],
  );
  const guardRef = useRef<(() => boolean) | null>(null);
  const registerNavigationGuard = useCallback((guard: () => boolean) => {
    guardRef.current = guard;
    return () => {
      if (guardRef.current === guard) {
        guardRef.current = null;
        setLocked(false);
      }
    };
  }, []);
  const isNavigationLocked = useCallback(
    () => guardRef.current?.() ?? false,
    [],
  );
  const current =
    currentCompanion?.id === id
      ? currentCompanion
      : ([...currentNavigation.companions, ...currentNavigation.saved].find(
          (companion) => companion.id === id,
        ) ?? null);

  return (
    <WorkspaceContext.Provider
      value={{
        navigation: currentNavigation,
        updateBookmark,
        getBookmarkState: (id, initial) =>
          id in bookmarkChanges ? Boolean(bookmarkChanges[id]) : initial,
        setCurrentCompanion,
        setLocked,
        registerNavigationGuard,
      }}
    >
      <main className="companion-workspace">
        <div className="border-border/40 hidden min-h-0 overflow-hidden rounded-2xl border bg-white md:block">
          <CompanionSidebar
            current={current}
            initial={currentNavigation}
            locked={locked}
            isNavigationLocked={isNavigationLocked}
          />
        </div>
        {children}
      </main>
    </WorkspaceContext.Provider>
  );
}
