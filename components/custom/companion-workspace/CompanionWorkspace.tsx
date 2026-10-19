"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import { Info, PanelLeft, X } from "lucide-react";
import type { CompanionRow } from "@/types";
import { Button } from "@/components/ui/Button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/Drawer";
import CompanionSidebar from "./CompanionSidebar";
import CompanionConversation from "./CompanionConversation";
import CompanionDetails from "./CompanionDetails";
import { useCompanionSession } from "./useCompanionSession";
import type { ConversationPage, WorkspaceSession } from "./session-messages";
import { useCompanionWorkspaceShell } from "./CompanionWorkspaceShell";

export default function CompanionWorkspace({
  companion,
  userId,
  userName,
  initialSession,
  initialConversation,
  voiceName,
  historyError,
  initialBookmarked,
}: {
  companion: CompanionRow;
  userId: string;
  userName: string;
  initialSession: WorkspaceSession | null;
  initialConversation: ConversationPage;
  voiceName: string | null;
  historyError: boolean;
  initialBookmarked: boolean | null;
}) {
  const { t } = useI18n();
  const session = useCompanionSession(
    companion,
    userId,
    initialSession,
    initialConversation,
    historyError,
  );
  const {
    navigation,
    setCurrentCompanion,
    setLocked,
    registerNavigationGuard,
  } = useCompanionWorkspaceShell();
  useEffect(() => {
    setCurrentCompanion(companion);
    return registerNavigationGuard(session.isNavigationLocked);
  }, [
    companion,
    setCurrentCompanion,
    registerNavigationGuard,
    session.isNavigationLocked,
  ]);
  useEffect(() => {
    setLocked(session.locked);
  }, [session.locked, setLocked]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const panelControls = (
    <>
      <Drawer direction="left" open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-xl md:hidden"
            aria-label={t("Open companion list")}
          >
            <PanelLeft className="size-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="!w-[min(90vw,380px)] bg-white">
          <DrawerHeader className="flex-row items-center justify-between border-b">
            <div>
              <DrawerTitle>
                <LocalizedText>Companions</LocalizedText>
              </DrawerTitle>
              <DrawerDescription>
                <LocalizedText>Choose your learning companion</LocalizedText>
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Close companion list")}
              >
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 flex-1">
            <CompanionSidebar
              current={companion}
              initial={navigation}
              locked={session.locked}
              isNavigationLocked={session.isNavigationLocked}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer
        direction="right"
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      >
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-xl xl:hidden"
            aria-label={t("Open companion details")}
          >
            <Info className="size-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="!w-[min(90vw,400px)] bg-white">
          <DrawerHeader className="flex-row items-center justify-between border-b">
            <div>
              <DrawerTitle>
                <LocalizedText>Companion details</LocalizedText>
              </DrawerTitle>
              <DrawerDescription>
                <LocalizedText>
                  About, preferences, and learning recap
                </LocalizedText>
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Close companion details")}
              >
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 flex-1">
            <CompanionDetails
              companion={companion}
              voiceName={voiceName}
              session={session}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );

  return (
    <>
      <div className="border-border/40 min-h-0 min-w-0 overflow-hidden rounded-2xl border bg-white">
        <CompanionConversation
          companion={companion}
          userName={userName}
          session={session}
          panelControls={panelControls}
          historyError={historyError}
          initialBookmarked={initialBookmarked}
        />
      </div>
      <div className="border-border/40 hidden min-h-0 overflow-hidden rounded-2xl border bg-white xl:block">
        <CompanionDetails
          companion={companion}
          voiceName={voiceName}
          session={session}
        />
      </div>
    </>
  );
}
