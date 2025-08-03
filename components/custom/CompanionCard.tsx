"use client";

import { Database } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Props = Database["public"]["Tables"]["companions"]["Row"] & {
  color: string;
  slug?: string;
};

const CompanionCard = ({
  color,
  duration,
  id,
  name,
  subject,
  topic,
}: Props) => {
  const [hover, setHover] = useState(false);

  return (
    <article
      style={{ backgroundColor: color, filter: hover ? "invert(1)" : "" }}
      className="companion-card transition-all duration-300"
    >
      <div className="flex justify-between">
        <div className="subject-badge">{subject}</div>

        <button
          type="button"
          title="Bookmark"
          aria-label="Bookmark button"
          className="companion-bookmark"
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
