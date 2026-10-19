"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import { Database } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "../ui/Badge";
import { savedBookmark } from "@/lib/services/bookmarks";
import { ClientToast } from "./ClientToast";
import { ToastTypes } from "@/lib/utils";
import { Bookmark } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

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
  const { t } = useI18n();
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
      setBookmark(response.bookmarked);
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
          <Badge className="subject-badge bg-black text-white">
            {t(subject ?? "")}
          </Badge>
          {isPublish && (
            <Badge className="subject-badge !bg-green-600">
              <LocalizedText>Community</LocalizedText>
            </Badge>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={bookmark ? t("Remove bookmark") : t("Add bookmark")}
              aria-pressed={!!bookmark}
              className="companion-bookmark"
              onClick={() => onBookmark()}
            >
              <Bookmark
                color="white"
                fill={bookmark ? "white" : "currentColor"}
                size={16}
                aria-hidden="true"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {bookmark ? t("Remove bookmark") : t("Add bookmark")}
          </TooltipContent>
        </Tooltip>
      </div>

      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="line-clamp-3 overflow-hidden text-sm text-ellipsis">
        {topic}
      </p>
      <div className="flex items-center gap-2">
        <Image
          src="/icons/clock.svg"
          alt={t("duration")}
          width={13.5}
          height={13.5}
        />
        <p className="text-sm">
          {duration} <LocalizedText>minutes</LocalizedText>
        </p>
      </div>

      <Link href={`/companions/${id}`} className="w-full">
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          type="button"
          aria-label={t("View lesson button")}
          className="btn-primary w-full justify-center border border-black/80 capitalize"
        >
          <LocalizedText>view lesson</LocalizedText>
        </button>
      </Link>
    </article>
  );
};

export default CompanionCard;
