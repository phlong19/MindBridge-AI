"use client";

import { useEffect, useState } from "react";
import Loading from "@/components/custom/Loading";
import VoiceTable from "@/components/custom/VoiceTable";
import { getVoicesList } from "@/lib/services/voices";
import { Voice } from "@/types";
import { toast } from "sonner";
import { getToastStyle } from "@/lib/utils";
import dayjs from "dayjs";

const Page = () => {
  const [data, setData] = useState<Voice[]>([]);
  const [error, setError] = useState<{
    message: string;
    description?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const formattedLastUpdate = data[0]?.createdAt
    ? dayjs(data[0].createdAt).format("dddd, MMM DD YYYY - HH:mm:ss A UTCZ")
    : undefined;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getVoicesList();

      if ("error" in result) {
        setData([]);
        setError({
          message: result.error ?? "Unable to fetch data.",
          description: result.errorDescription,
        });
      } else {
        setError(null);
        setData(result.data ?? []);
      }
      setLoading(false);
    }

    void fetchData();
  }, []);

  useEffect(() => {
    if (!error) return;

    toast.error(error.message, {
      ...getToastStyle("error"),
      description: error.description,
    });
  }, [error]);

  if (loading) return <Loading />;

  return (
    <main className="gap-0">
      <VoiceTable data={data} lastUpdated={formattedLastUpdate} />
    </main>
  );
};

export default Page;
