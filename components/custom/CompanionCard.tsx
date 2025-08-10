"use client";

import { Database } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "../ui/Badge";
// import { toast } from "sonner";
// import { error } from "@/constants/message";
// import { getToastStyle } from "@/lib/utils";
import { savedBookmark } from "@/lib/services/bookmarks";
import { ClientErrorToast } from "./ClientErrorToast";

type Props = Database["public"]["Tables"]["companions"]["Row"] & {
  color: string;
  slug?: string;
  userId?: string;
};

const CompanionCard = ({
  color,
  duration,
  id,
  name,
  subject,
  topic,
  isPublish,
}: Props) => {
  const [hover, setHover] = useState(false);
  const [errorResponse, setErrorResponse] = useState<{
    error: string;
    errorDescription?: string;
  }>({ error: "", errorDescription: "" });

  async function onBookmark() {
    const { error, errorDescription } = await savedBookmark(id);
    setErrorResponse({ error, errorDescription });
  }

  return (
    <article
      style={{ backgroundColor: color, filter: hover ? "invert(1)" : "" }}
      className="companion-card transition-all duration-300"
    >
      <ClientErrorToast
        error={errorResponse.error}
        errorDescription={errorResponse.errorDescription}
      />
      <div className="flex justify-between">
        <div className="flex items-center gap-1">
          <Badge className="subject-badge bg-black text-white">{subject}</Badge>
          {isPublish && <Badge className="subject-badge">Community</Badge>}
        </div>

        <button
          type="button"
          title="Bookmark"
          aria-label="Bookmark button"
          className="companion-bookmark"
          onClick={() => onBookmark()}
        >
          <Image
            src="/icons/bookmark.svg"
            alt="bookmark"
            width={12.5}
            height={15}
          />
        </button>
      </div>

      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="line-clamp-3 overflow-hidden text-sm text-ellipsis">
        {topic}
      </p>
      <div className="flex items-center gap-2">
        <Image
          src="/icons/clock.svg"
          alt="duration"
          width={13.5}
          height={13.5}
        />
        <p className="text-sm">{duration} minutes</p>
      </div>

      <Link href={`/companions/${id}`} className="w-full">
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          type="button"
          aria-label="View lesson button"
          className="btn-primary w-full justify-center border border-black/80 capitalize"
        >
          view lesson
        </button>
      </Link>
    </article>
  );
};

export default CompanionCard;
