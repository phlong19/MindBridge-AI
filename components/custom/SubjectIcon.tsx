import { cn, getSubjectColor } from "@/lib/utils";
import Image from "next/image";
import React from "react";

interface Props {
  subject: string;
  className: string;
  width?: number;
  height?: number;
}

const SubjectIcon = ({
  subject,
  className,
  height = 35,
  width = 35,
}: Props) => {
  return (
    <div
      className={cn(
        "flex w-fit items-center justify-center rounded-md p-2",
        className,
      )}
      style={{ backgroundColor: getSubjectColor(subject) }}
    >
      <Image
        src={`/icons/${subject}.svg`}
        alt={subject}
        width={width}
        height={height}
      />
    </div>
  );
};

export default SubjectIcon;
