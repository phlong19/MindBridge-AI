import CompanionForm from "@/components/custom/CompanionForm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

async function Page() {
  // const { userId}  = await auth();
  const userId = "235352";

  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);
  }

  return (
    <main className="items-center justify-center min-md:w-2/3 min-lg:w-1/3">
      <article className="flex w-full flex-col gap-4">
        <h1>Companion Builder</h1>

        <CompanionForm />
      </article>
    </main>
  );
}

export default Page;
