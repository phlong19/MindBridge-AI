import { ClientErrorToast } from "@/components/custom/ClientErrorToast";
import CompanionsList from "@/components/custom/CompanionsList";
import NoCompanions from "@/components/custom/NoCompanions";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/Accordion";
import { TypographyP } from "@/components/ui/Typography";
import {
  getCompanionList,
  getUserSessionHistories,
} from "@/lib/services/companion";
import { SearchParams } from "@/types";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";

async function page({ searchParams }: SearchParams) {
  const params = await searchParams;
  const { limit, page, topic, subject } = params;

  const currentPage = Number(page) || undefined;
  const itemPerPage = Number(limit) || undefined;

  const {
    data: companions,
    error,
    errorDescription,
  } = await getCompanionList({
    limit: itemPerPage,
    page: currentPage,
    subject,
    topic,
  });

  const user = await currentUser();

  if (!user) redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);

  const sessionsHistory = await getUserSessionHistories(user.id);

  if (error) {
    return (
      <ClientErrorToast error={error} errorDescription={errorDescription} />
    );
  }

  return (
    <main className="min-lg:w-3/4">
      <section className="flex items-center justify-between gap-3 max-sm:flex-col">
        <div className="flex items-center gap-3">
          <Image
            className="rounded-lg"
            src={user.imageUrl}
            alt={
              user.firstName ||
              user.lastName ||
              user.fullName ||
              user.username ||
              user.emailAddresses[0].emailAddress
            }
            width={110}
            height={110}
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">
              {user.firstName ? user.firstName + " " + user.lastName : "User"}
            </h1>

            <TypographyP className="text-muted-foreground text-sm">
              {user.emailAddresses[0].emailAddress}
            </TypographyP>
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="flex h-fit flex-col gap-2 rounded-lg border border-black p-3">
            <div className="flex items-center gap-2">
              <Image
                src="/icons/check.svg"
                alt="icon checkmark"
                width={22}
                height={22}
              />
              <TypographyP className="text-lg font-bold">
                {Array.isArray(sessionsHistory) && sessionsHistory.length
                  ? sessionsHistory.length
                  : 0}
              </TypographyP>
            </div>
            <div>Lessons completed</div>
          </div>
          <div className="flex h-fit flex-col gap-2 rounded-lg border border-black p-3">
            <div className="flex items-center gap-2">
              <Image
                src="/icons/cap.svg"
                alt="icon checkmark"
                width={22}
                height={22}
              />

              <TypographyP className="text-lg font-bold">
                {companions?.length}
              </TypographyP>
            </div>
            <div>Companions created</div>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <Accordion type="multiple">
          <AccordionItem value="sessions">
            <AccordionTrigger className="data-[state=open]:text-primary text-xl font-semibold">
              Recent Sessions
            </AccordionTrigger>
            <AccordionContent>
              {Array.isArray(sessionsHistory) ? (
                <CompanionsList title="" companions={sessionsHistory} />
              ) : (
                <NoCompanions />
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="companions">
            <AccordionTrigger className="data-[state=open]:text-primary text-xl font-semibold">
              My Companions ({companions?.length || 0})
            </AccordionTrigger>
            <AccordionContent>
              {companions?.length ? (
                <CompanionsList companions={companions} title="" />
              ) : (
                <NoCompanions />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </main>
  );
}

export default page;
