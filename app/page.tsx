import { LocalizedText } from "@/lib/i18n/provider";
import CompanionCard from "@/components/custom/CompanionCard";
import CompanionsList from "@/components/custom/CompanionsList";
import CTA from "@/components/custom/CTA";
import { getCompanionList } from "@/lib/services/companion";
import { getSubjectColor } from "@/lib/utils";
import { ClientToast } from "@/components/custom/ClientToast";
import NoCompanions from "@/components/custom/NoCompanions";
import { getRecentlyPracticedCompanions } from "@/lib/services/sessions-history";

async function Page() {
  const [{ data: companions, error, errorDescription }, recentCompanions] =
    await Promise.all([
      getCompanionList({ limit: 3, authorized: false }),
      getRecentlyPracticedCompanions(10),
    ]);

  return (
    <main>
      <h1 className="text-2xl underline">
        <LocalizedText>Popular Community Companions</LocalizedText>
      </h1>

      {error && <ClientToast title={error} message={errorDescription} />}

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
        {Array.isArray(recentCompanions) && (
          <CompanionsList
            title="Recently Practiced Companions"
            description="Explore what others are practicing. Open a companion to start or continue your own conversation."
            emptyMessage="No companions have been practiced recently."
            companions={recentCompanions}
            className="w-full lg:w-2/3"
          />
        )}
        <CTA className={!Array.isArray(recentCompanions) ? "!w-full" : ""} />
      </section>
    </main>
  );
}

export default Page;
