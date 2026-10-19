"use client";

import Image from "next/image";
import { useState } from "react";
import type { CompanionRow } from "@/types";
import { cn, getSubjectColor } from "@/lib/utils";

export default function CompanionAvatar({
  companion,
  className,
  alt = "",
  sizes = "72px",
}: {
  companion: CompanionRow;
  className?: string;
  alt?: string;
  sizes?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const photo = companion.photoUrl && companion.photoUrl !== failedSource;
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
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        className={photo ? "object-cover" : "object-contain p-2.5"}
        onError={photo ? () => setFailedSource(companion.photoUrl) : undefined}
      />
    </div>
  );
}
