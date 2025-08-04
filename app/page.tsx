import CompanionCard from "@/components/custom/CompanionCard";
import CompanionsList from "@/components/custom/CompanionsList";
import CTA from "@/components/custom/CTA";
import {
  getCompanionList,
  getSessionHistories,
} from "@/lib/services/companion";
import { getSubjectColor } from "@/lib/utils";
import { ClientErrorToast } from "@/components/custom/ClientErrorToast";
import NoCompanions from "@/components/custom/NoCompanions";

async function Page() {
  const {
    data: companions,
    error,
    errorDescription,
  } = await getCompanionList({ limit: 3 });
  const recentSessions = await getSessionHistories(10);

  if (error && !Array.isArray(recentSessions)) {
    return (
      <ClientErrorToast error={error} errorDescription={errorDescription} />
    );
  }

  return (
    <main>
      <h1 className="text-2xl underline">Popular Community Companions</h1>

      <section className="home-section items-stretch">
        {companions?.length ? (
          companions.map((i) => (
            <CompanionCard
              key={i.id}
              {...i}
              slug={i.slug!}
              color={getSubjectColor(i.subject!)}
            />
          ))
        ) : (
          <NoCompanions />
        )}
      </section>

      <section className="home-section mb-8">
        {Array.isArray(recentSessions) && (
          <CompanionsList
            title="Recent Completed Publishing Sessions"
            companions={recentSessions}
            className="w-full lg:w-2/3"
          />
        )}
        <CTA />
      </section>
    </main>
  );
}

export default Page;
