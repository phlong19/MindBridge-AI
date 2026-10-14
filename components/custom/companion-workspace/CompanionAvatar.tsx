"use client";

import Image from "next/image";
import { useState } from "react";
import type { CompanionRow } from "@/types";
import { cn, getSubjectColor } from "@/lib/utils";

export default function CompanionAvatar({
  companion,
  className,
}: {
  companion: CompanionRow;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = companion.photoUrl && !failed;
  return (
    <div
      className={cn(
        "relative size-12 shrink-0 overflow-hidden rounded-xl",
        className,
      )}
      style={{
        backgroundColor:
          getSubjectColor(companion.subject ?? "maths") ?? "#ffdfcc",
      }}
    >
      <Image
        src={
          photo
            ? companion.photoUrl!
            : `/icons/${companion.subject ?? "maths"}.svg`
        }
        alt=""
        fill
        sizes="72px"
        unoptimized
        className={photo ? "object-cover" : "object-contain p-2.5"}
        onError={photo ? () => setFailed(true) : undefined}
      />
    </div>
  );
}
