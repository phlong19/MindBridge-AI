import { getCompanionList } from "@/lib/services/companion";
import { SearchParams } from "@/types";
import CompanionsListWrapper from "@/components/custom/CompanionsListWrapper";

const Page = async ({ searchParams }: SearchParams) => {
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
    <CompanionsListWrapper
      count={count}
      data={data}
      error={error}
      errorDescription={errorDescription}
    />
  );
};

export default Page;
