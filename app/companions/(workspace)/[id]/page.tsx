import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RedirectWithToast } from "@/components/custom/ClientToast";
import CompanionWorkspace from "@/components/custom/companion-workspace/CompanionWorkspace";
import { getCompanion } from "@/lib/services/companion";
import { getCompanionConversation } from "@/lib/services/sessions-history";
import { getVoicesList } from "@/lib/services/voices";
import { error as errorMessage } from "@/constants/message";
import { navLinks } from "@/constants";
import { getSignInPath } from "@/lib/auth-redirect";
import { getCompanionBookmarkStatus } from "@/lib/services/bookmarks";

interface Props {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: Props) => {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(getSignInPath(`/companions/${encodeURIComponent(id)}`));
  const { companion, error } = await getCompanion(id, user.id);
  if (!companion)
    return (
      <RedirectWithToast
        title={errorMessage.fetchFail}
        message={error}
        delay={300}
        redirectTo={navLinks.companions.href}
      />
    );

  const [historyResult, voicesResult, bookmarkResult] =
    await Promise.allSettled([
      getCompanionConversation(id),
      getVoicesList(),
      getCompanionBookmarkStatus(id),
    ]);
  const history =
    historyResult.status === "fulfilled" ? historyResult.value : null;
  const conversation =
    history && "data" in history ? history : { data: [], nextCursor: null };
  const latest = conversation.data.at(-1) ?? null;
  const voices =
    voicesResult.status === "fulfilled" && "data" in voicesResult.value
      ? voicesResult.value.data
      : null;
  const historyError =
    historyResult.status === "rejected" ||
    Boolean(history && "error" in history && history.error);

  return (
    <CompanionWorkspace
      key={`${id}-${historyError ? "history-error" : (latest?.id ?? "new")}`}
      companion={companion}
      userId={user.id}
      userName={user.firstName ?? user.lastName ?? user.username ?? ""}
      initialSession={latest}
      initialConversation={conversation}
      voiceName={
        voices?.find((voice) => voice.id === companion.voiceId)?.name ?? null
      }
      historyError={historyError}
      initialBookmarked={
        bookmarkResult.status === "fulfilled" ? bookmarkResult.value : null
      }
    />
  );
};

export default Page;
