"use client";

import { useEffect, useState } from "react";
import Loading from "@/components/custom/Loading";
import VoiceTable from "@/components/custom/VoiceTable";
import { getVoicesList } from "@/lib/services/voices";
import { Voice } from "@/types";
import { toast } from "sonner";
import { getToastStyle } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

const Page = () => {
  const { t, locale } = useI18n();
  const [data, setData] = useState<Voice[]>([]);
  const [error, setError] = useState<{
    message: string;
    description?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const formattedLastUpdate = data[0]?.createdAt
    ? new Date(data[0].createdAt).toLocaleString(
        locale === "vi" ? "vi-VN" : "en-US",
        { timeZone: "Asia/Bangkok", dateStyle: "long", timeStyle: "medium" },
      )
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

    toast.error(t(error.message), {
      ...getToastStyle("error"),
      description: error.description ? t(error.description) : undefined,
    });
  }, [error, t]);

  if (loading) return <Loading />;

  return (
    <main className="gap-0">
      <VoiceTable data={data} lastUpdated={formattedLastUpdate} />
    </main>
  );
};

export default Page;
