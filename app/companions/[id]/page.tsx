import CompanionInterlink from "@/components/custom/CompanionInterlink";
import { getCompanion } from "@/lib/services/companion";
import { getSubjectColor } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";
import React from "react";
import { toast } from "sonner";

interface Props {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: Props) => {
  const { id } = await params;
  const { companion, error } = await getCompanion(id);
  const user = await currentUser();

  if (!user) redirect("/auth/login");
  if (!companion || error) {
    toast(error);
    return redirect("/companions");
  }

  return (
    <main>
      <article className="rounded-border flex justify-between p-6 max-md:flex-col">
        <div className="flex items-center justify-start gap-2">
          <div
            className="flex size-[72px] items-center justify-center rounded-lg max-md:hidden"
            style={{ backgroundColor: getSubjectColor(companion.subject) }}
          >
            <Image
              width={0}
              height={0}
              style={{ width: 35, height: 35 }}
              src={`/icons/${companion.subject}.svg`}
              alt={companion.subject}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">{companion.name}</p>
              <div className="subject-badge max-sm:hidden">
                {companion.subject}
              </div>
            </div>

            <p className="text-md">{companion.topic}</p>
          </div>
        </div>
        <div className="items-start text-xl max-md:hidden">
          {companion.duration} minutes.
        </div>
      </article>
      <CompanionInterlink
        {...companion}
        companionId={id}
        userImage={user.imageUrl}
        userName={user.firstName ?? user.username!}
      />
    </main>
  );
};

export default Page;
