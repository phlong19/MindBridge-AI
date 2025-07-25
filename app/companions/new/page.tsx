import CompanionForm from "@/components/custom/CompanionForm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);
  }

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
