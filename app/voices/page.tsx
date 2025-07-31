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
  const [error, setError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const formattedLastUpdate = dayjs(data[0]?.createdAt).format(
    "dddd, MMM DD YYYY - HH:mm:ss A UTCZ",
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getVoicesList();

      if (result.error) {
        setError({
          message: result.error,
          description: result.errorDescription,
        });
      } else {
        setData(result.data ?? []);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return <Loading />;

  if (error.error) {
    toast.error(error.message, {
      ...getToastStyle("error"),
      description: error.description,
    });
  }

  return (
    <main className="gap-0">
      <VoiceTable data={data} lastUpdated={formattedLastUpdate} />
    </main>
  );
};

export default Page;
