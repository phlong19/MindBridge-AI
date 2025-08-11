import { RedirectWithToast } from "@/components/custom/ClientToast";
import CompanionForm from "@/components/custom/CompanionForm";
import { navLinks } from "@/constants";
import { newCompanionPermissions } from "@/lib/services/companion";

async function Page() {
  const canCreateCompanion = await newCompanionPermissions();

  return (
    <main className="items-center justify-center md:w-2/3 lg:w-1/2 xl:w-1/3 xl:min-w-[550px]">
      <article className="flex w-full flex-col gap-4">
        <h1>Companion Builder</h1>
        {canCreateCompanion === true ? (
          <CompanionForm />
        ) : (
          <RedirectWithToast
            delay={300}
            redirectTo={navLinks.companions.href}
            title={canCreateCompanion.error}
            message={canCreateCompanion.errorDescription}
          />
        )}
      </article>
    </main>
  );
}

export default Page;
