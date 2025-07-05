import { getCompanionList } from "@/lib/services/companion";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const Page = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!);
  }

  const data = await getCompanionList();

  return (
    <main>
      <textarea placeholder="hehe" name="test" id="test">
        {JSON.stringify(data, null, 2)}
      </textarea>
    </main>
  );
};

export default Page;
