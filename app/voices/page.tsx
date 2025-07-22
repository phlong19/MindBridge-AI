import ClientErrorToast from "@/components/custom/ClientErrorToast";
import Loading from "@/components/custom/Loading";
import VoiceTable from "@/components/custom/VoiceTable";
import { getVoicesList } from "@/lib/services/voices";
import { Suspense } from "react";

const Page = async () => {
  const result = await getVoicesList();

  return (
    <Suspense fallback={<Loading />}>
      <main className="gap-0">
        {result.error ? (
          <>
            <ClientErrorToast
              error={result.error}
              errorDescription={result.errorDescription}
            />
          </>
        ) : (
          ""
        )}
        <VoiceTable data={result.data ?? []} />
      </main>
    </Suspense>
  );
};

export default Page;
