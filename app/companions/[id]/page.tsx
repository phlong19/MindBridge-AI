import { RedirectWithToast } from "@/components/custom/ClientErrorToast";
import CompanionInterlink from "@/components/custom/CompanionInterlink";
import { getCompanion } from "@/lib/services/companion";
import { getSubjectColor } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";
import { error as errorMessage } from "@/constants/message";
import GoBackButton from "@/components/custom/GoBackButton";
import { navLinks } from "@/constants";

interface Props {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: Props) => {
  const { id } = await params;
  const { companion, error } = await getCompanion(id);
  const user = await currentUser();

  if (!user) redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);
  if (!companion || error) {
    return (
      <RedirectWithToast
        error={errorMessage.fetchFail}
        errorDescription={error}
        delay={300}
        redirectTo={navLinks.companions.href}
      />
    );
  }

  const { subject, name, topic, duration } = companion;

  return (
    <main>
      <GoBackButton className="justify-start" />
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
              <div className="subject-badge max-sm:hidden">{subject}</div>
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
        companionId={id}
        userImage={user.imageUrl}
        userName={user.firstName ?? user.lastName ?? user.username ?? "User"}
      />
    </main>
  );
};

export default Page;
