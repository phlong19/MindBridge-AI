"use client";

import "./workspace.css";

import {
  createContext,
  useCallback,
  useContext,
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
      : ([...navigation.companions, ...navigation.saved].find(
          (companion) => companion.id === id,
        ) ?? null);

  return (
    <WorkspaceContext.Provider
      value={{
        navigation,
        setCurrentCompanion,
        setLocked,
        registerNavigationGuard,
      }}
    >
      <main className="companion-workspace">
        <div className="border-border/40 hidden min-h-0 overflow-hidden rounded-2xl border bg-white md:block">
          <CompanionSidebar
            current={current}
            initial={navigation}
            locked={locked}
            isNavigationLocked={isNavigationLocked}
          />
        </div>
        {children}
      </main>
    </WorkspaceContext.Provider>
  );
}
