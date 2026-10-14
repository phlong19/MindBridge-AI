import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RedirectWithToast } from "@/components/custom/ClientToast";
import CompanionWorkspace from "@/components/custom/companion-workspace/CompanionWorkspace";
import { getCompanion } from "@/lib/services/companion";
import { getLastUserSession } from "@/lib/services/sessions-history";
import { getVoicesList } from "@/lib/services/voices";
import { error as errorMessage } from "@/constants/message";
import { navLinks } from "@/constants";

interface Props {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: Props) => {
  const user = await currentUser();
  if (!user) redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);
  const { id } = await params;
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

  const [historyResult, voicesResult] = await Promise.allSettled([
    getLastUserSession(id, user.id),
    getVoicesList(),
  ]);
  const history =
    historyResult.status === "fulfilled" ? historyResult.value : null;
  const latest = history && "data" in history ? history.data : null;
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
      userName={user.firstName ?? user.lastName ?? user.username ?? "You"}
      initialSession={
        latest
          ? {
              id: latest.id,
              messages: latest.messages,
              learning_recap: latest.learning_recap,
              interaction_mode: latest.interaction_mode,
              ended_by_user: latest.ended_by_user,
              created_at: latest.created_at,
              canResume: Boolean(latest.vapi_chat_id),
            }
          : null
      }
      voiceName={
        voices?.find((voice) => voice.id === companion.voiceId)?.name ?? null
      }
      historyError={historyError}
    />
  );
};

export default Page;
