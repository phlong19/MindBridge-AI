import { cn } from "@/lib/utils";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Link from "next/link";
import SubjectIcon from "./SubjectIcon";
import Image from "next/image";
import { Companion } from "@/types";
import { TypographyH4, TypographyP } from "../ui/Typography";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/Tooltip";

const CompanionsList = ({
  title,
  companions = [],
  className,
}: {
  title: string;
  companions: Companion[];
  className?: string;
}) => {
  return (
    <article className={cn("companion-list", className)}>
      <h2 className="text-3xl font-bold">{title}</h2>
      <br />
      {!!companions.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2/3 text-lg">Lessons</TableHead>
              <TableHead className="text-lg">Subject</TableHead>
              <TableHead className="text-right text-lg">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companions.map(({ id, subject, name, duration, topic }) => (
              <TableRow key={id}>
                <TableCell>
                  <Link href={`/companions/${id}`}>
                    <div className="flex items-center gap-3.5">
                      <SubjectIcon
                        subject={subject}
                        className="size-[72px] min-w-[72px] max-md:hidden"
                      />
                      <div className="flex flex-col gap-2">
                        <p className="text-xl font-bold">{name}</p>
                        <Tooltip>
                          <TooltipTrigger>
                            <p className="line-clamp-2 overflow-hidden text-left text-ellipsis">
                              {topic}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[600px]">
                            <TypographyP className="leading-normal">
                              {topic}
                            </TypographyP>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="subject-badge w-fit max-md:hidden">
                    {subject}
                  </div>

                  <SubjectIcon
                    subject={subject}
                    width={18}
                    height={18}
                    className="w-fit md:hidden"
                  />
                </TableCell>

                <TableCell>
                  <div className="flex w-full items-center justify-end gap-2">
                    <p className="text-base md:text-xl">
                      {duration} <span className="">mins</span>
                    </p>
                    <Image
                      src="/icons/clock.svg"
                      alt="minutes"
                      width={15}
                      height={15}
                      className="max-md:hidden"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <TypographyH4 className="font-normal">
          You haven’t added anything yet.
        </TypographyH4>
      )}
    </article>
  );
};

export default CompanionsList;
