"use client";

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
          <SelectValue placeholder="subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="/">All subjects</SelectItem>
          {subjects.map((subject) => (
            <SelectItem key={subject} value={subject}>
              {subject}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SubjectFilter;
