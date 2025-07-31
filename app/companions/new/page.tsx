import CompanionForm from "@/components/custom/CompanionForm";

async function Page() {
  return (
    <main className="items-center justify-center md:w-2/3 lg:w-1/2 xl:w-1/3">
      <article className="flex w-full flex-col gap-4">
        <h1>Companion Builder</h1>

        <CompanionForm />
      </article>
    </main>
  );
}

export default Page;
