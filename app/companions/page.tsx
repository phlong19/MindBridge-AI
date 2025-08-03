import { getCompanionList } from "@/lib/services/companion";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
// import {
//   Pagination,
//   PaginationContent,
//   PaginationEllipsis,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// } from "@/components/ui/Pagination";
import Searchbar from "@/components/custom/Searchbar";
import CompanionCard from "@/components/custom/CompanionCard";
import { getSubjectColor } from "@/lib/utils";
import { TypographyH4 } from "@/components/ui/Typography";
import SubjectFilter from "@/components/custom/SubjectFilter";
import { error as errorMessage } from "@/constants/message";
import { SearchParams } from "@/types";

const Page = async ({ searchParams }: SearchParams) => {
  const { userId } = await auth();

  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);
  }
  const params = await searchParams;
  const { limit, page, topic, subject } = params;

  const currentPage = Number(page) || undefined;
  const itemPerPage = Number(limit) || undefined;

  const { data, error, count, errorDescription } = await getCompanionList({
    limit: itemPerPage,
    page: currentPage,
    subject,
    topic,
  });

  return (
    <main>
      <section className="flex justify-between gap-4 max-sm:flex-col">
        <h1>Companion Library</h1>

        <div className="flex flex-col gap-2 md:flex-row">
          <Searchbar />
          <SubjectFilter />
        </div>
      </section>
      <div>
        {error || !data ? (
          <div className="container mx-auto flex h-60 flex-col items-center justify-center">
            <TypographyH4 className="text-red-500">{error}</TypographyH4>
            {errorDescription && <i className="">{errorDescription}</i>}
          </div>
        ) : count === 0 ? (
          <section className="mt-10">
            <TypographyH4 className="text-muted-foreground">
              {errorMessage.noResults}
            </TypographyH4>
          </section>
        ) : (
          <section className="companions-grid">
            {data.map((companion) => (
              <CompanionCard
                key={companion.id}
                {...companion}
                slug={companion.slug!}
                color={getSubjectColor(companion.subject ?? "")}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default Page;
