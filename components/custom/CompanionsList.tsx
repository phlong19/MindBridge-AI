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

const CompanionsList = ({
  title,
  companions = [],
  className,
}: {
  title: string;
  companions: Companion[];
  className: string;
}) => {
  return (
    <article className={cn("companion-list mb-8", className)}>
      <h2 className="text-3xl font-bold">{title}</h2>
      <br />
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
                  <div className="flex items-center gap-2">
                    <SubjectIcon
                      subject={subject}
                      className="size-[72px] max-md:hidden"
                    />
                    <div className="flex flex-col gap-2">
                      <p className="text-2xl font-bold">{name}</p>
                      <p className="text-lg">{topic}</p>
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
    </article>
  );
};

export default CompanionsList;
