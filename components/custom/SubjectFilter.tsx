"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { subjects } from "@/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SubjectFilter = () => {
  const { t } = useI18n();
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "/") {
      params.delete("subject");
    } else {
      params.set("subject", value);
    }
    router.push(pathName + `?${params.toString()}`);
  }

  return (
    <div className="w-full md:w-40">
      <Select defaultValue="/" onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("subject")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="/">
            <LocalizedText>All subjects</LocalizedText>
          </SelectItem>
          {subjects.map((subject) => (
            <SelectItem key={subject} value={subject}>
              {t(subject)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SubjectFilter;
