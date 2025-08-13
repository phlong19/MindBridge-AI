import CompanionCard from "@/components/custom/CompanionCard";
import CompanionsList from "@/components/custom/CompanionsList";
import CTA from "@/components/custom/CTA";
import {
  getCompanionList,
} from "@/lib/services/companion";
import { getSubjectColor } from "@/lib/utils";
import { ClientToast } from "@/components/custom/ClientToast";
import NoCompanions from "@/components/custom/NoCompanions";
import { getSessionHistories } from "@/lib/services/sessions-history";

async function Page() {
  const {
    data: companions,
    error,
    errorDescription,
  } = await getCompanionList({ limit: 3, authenticated: false });
  const recentSessions = await getSessionHistories(10);

  return (
    <main>
      <h1 className="text-2xl underline">Popular Community Companions</h1>

      {error && !Array.isArray(recentSessions) && (
        <ClientToast title={error} message={errorDescription} />
      )}

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
        <CTA className={!Array.isArray(recentSessions) ? "!w-full" : ""} />
      </section>
    </main>
  );
}

export default Page;
