import { RedirectWithToast } from "@/components/custom/ClientErrorToast";
import CompanionForm from "@/components/custom/CompanionForm";
import { navLinks } from "@/constants";
import { newCompanionPermissions } from "@/lib/services/companion";

async function Page() {
  const canCreateCompanion = await newCompanionPermissions();

  return (
    <main className="items-center justify-center md:w-2/3 lg:w-1/2 xl:w-1/3">
      <article className="flex w-full flex-col gap-4">
        <h1>Companion Builder</h1>
        {canCreateCompanion === true ? (
          <CompanionForm />
        ) : (
          <RedirectWithToast
            delay={300}
            redirectTo={navLinks.companions.href}
            error={canCreateCompanion.error}
            errorDescription={canCreateCompanion.errorDescription}
          />
        )}
      </article>
    </main>
  );
}

export default Page;
