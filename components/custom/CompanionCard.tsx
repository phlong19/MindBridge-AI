"use client";

import { Database } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "../ui/Badge";
import { savedBookmark } from "@/lib/services/bookmarks";
import { ClientToast } from "./ClientToast";
import { ToastTypes } from "@/lib/utils";
import { Bookmark } from "lucide-react";

type Props = Database["public"]["Tables"]["companions"]["Row"] & {
  color: string;
  slug?: string;
  userId?: string;
  isBookmarked?: boolean;
};

const CompanionCard = ({
  color,
  duration,
  id,
  name,
  subject,
  topic,
  isPublish,
  isBookmarked,
}: Props) => {
  const [hover, setHover] = useState(false);
  const [errorResponse, setErrorResponse] = useState<{
    type: ToastTypes;
    title: string;
    message?: string;
  }>({
    type: "error",
    title: "",
    message: "",
  });
  const [bookmark, setBookmark] = useState(isBookmarked);

  async function onBookmark() {
    const response = await savedBookmark(id);
    setErrorResponse(response);
    if (response.type === "success") {
      setBookmark(!bookmark);
    } else {
      setBookmark(false);
    }
  }

  return (
    <article
      style={{ backgroundColor: color, filter: hover ? "invert(1)" : "" }}
      className="companion-card transition-all duration-300"
    >
      <ClientToast {...errorResponse} />
      <div className="flex justify-between">
        <div className="flex items-center gap-1">
          <Badge className="subject-badge bg-black text-white">{subject}</Badge>
          {isPublish && (
            <Badge className="subject-badge !bg-green-600">Community</Badge>
          )}
        </div>

        <button
          type="button"
          title="Bookmark"
          aria-label="Bookmark button"
          className="companion-bookmark"
          onClick={() => onBookmark()}
        >
          <Bookmark
            color="white"
            fill={bookmark ? "white" : "currentColor"}
            size={16}
            aria-label="bookmark icon"
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
