import { getSubjectColor } from "@/lib/utils";
import { ClientToast } from "./ClientToast";
import Searchbar from "./Searchbar";
import SubjectFilter from "./SubjectFilter";
import CompanionCard from "./CompanionCard";
import { TypographyH4 } from "../ui/Typography";
import { error as errorMessage } from "@/constants/message";
import { CompanionRow } from "@/types";

interface Props {
  error?: string;
  errorDescription?: string;
  data?: CompanionRow[];
  count?: number | null;
}

const CompanionsListWrapper = ({
  error,
  errorDescription,
  data,
  count,
}: Props) => {
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
          <ClientToast title={error!} message={errorDescription} />
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

export default CompanionsListWrapper;
