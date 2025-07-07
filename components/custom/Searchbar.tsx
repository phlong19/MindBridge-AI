"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/Input";
import { Search } from "lucide-react";

const Searchbar = () => {
  const pathName = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("topic") || "";
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue === query) return;

      const params = new URLSearchParams(searchParams.toString());

      if (inputValue) {
        params.set("topic", inputValue);
      } else {
        params.delete("topic");
      }

      router.push(pathName + `?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, inputValue, pathName, router, searchParams]);

  return (
    <div className="relative h-fit w-full sm:w-xs">
      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
        <Search className="h-4 w-4" />
      </span>
      <Input
        className="pl-8"
        value={inputValue}
        type="text"
        maxLength={255}
        placeholder="Search by topic.."
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
};

export default Searchbar;
