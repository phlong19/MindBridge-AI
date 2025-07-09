"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "../ui/Input";
import { Search } from "lucide-react";
import { TypographyInlineCode } from "../ui/Typography";

const Searchbar = () => {
  const pathName = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const query = searchParams.get("topic") || "";
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus({ preventScroll: false });
      }
    }

    document.addEventListener("keydown", handleKeyPress);

    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

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
    }, 300);

    return () => clearTimeout(timer);
  }, [query, inputValue, pathName, router, searchParams]);

  return (
    <div className="relative h-fit w-full sm:w-xs">
      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
        <Search className="h-4 w-4" />
      </span>
      <Input
        ref={inputRef}
        className="px-16 pl-8"
        value={inputValue}
        type="text"
        maxLength={255}
        placeholder="Press / to quick search by topic.."
        onChange={(e) => setInputValue(e.target.value)}
      />
      <TypographyInlineCode className="border- absolute top-1/2 right-1 -translate-1/2 border bg-[lightgray]/50">
        /
      </TypographyInlineCode>
    </div>
  );
};

export default Searchbar;
