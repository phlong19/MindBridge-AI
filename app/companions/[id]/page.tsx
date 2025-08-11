import { RedirectWithToast } from "@/components/custom/ClientToast";
import CompanionInterlink from "@/components/custom/CompanionInterlink";
import { getCompanion, getLastUserSession } from "@/lib/services/companion";
import { getSubjectColor } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";
import { error as errorMessage } from "@/constants/message";
import { navLinks } from "@/constants";
import { Badge } from "@/components/ui/Badge";
import GoBackWrapper from "@/components/custom/GoBackButton";

interface Props {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: Props) => {
  const user = await currentUser();

  if (!user) redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);

  const { id } = await params;
  const { companion, error } = await getCompanion(id, user.id);
  const {
    data,
    error: fetchSessionError,
    errorDescription,
  } = await getLastUserSession(id, user.id);

  if (!data || !companion || error || fetchSessionError) {
    return (
      <RedirectWithToast
        title={errorMessage.fetchFail}
        message={error || errorDescription}
        delay={300}
        redirectTo={navLinks.companions.href}
      />
    );
  }

  const { subject, name, topic, duration } = companion;

  return (
    <main>
      <GoBackWrapper className="justify-start" />
      <article className="rounded-border flex justify-between gap-4 p-6 max-md:flex-col">
        <div className="flex items-center justify-start gap-4">
          <div
            className="flex size-[72px] min-w-[72px] items-center justify-center rounded-lg max-md:hidden"
            style={{ backgroundColor: getSubjectColor(subject!) }}
          >
            <Image
              width={0}
              height={0}
              style={{ width: 35, height: 35 }}
              src={`/icons/${companion.subject}.svg`}
              alt={companion.subject!}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">{name}</p>
              <Badge
                variant="outline"
                className="!max-h-7 !self-stretch rounded-4xl px-2.5 capitalize max-sm:hidden"
              >
                {subject}
              </Badge>
              {companion.isPublish && (
                <Badge className="max-h-7 !self-stretch !rounded-4xl max-sm:hidden">
                  Community
                </Badge>
              )}
            </div>

            <p className="text-md">{topic}</p>
          </div>
        </div>
        <div className="items-start text-xl font-semibold max-md:hidden">
          {duration} minutes.
        </div>
      </article>
      <CompanionInterlink
        {...companion}
        fetchedMessages={data?.messages}
        sessionId={data?.id}
        companionId={id}
        userId={user.id}
        userImage={user.imageUrl}
        userName={user.firstName ?? user.lastName ?? user.username ?? "User"}
      />
    </main>
  );
};

export default Page;
