"use client";

import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { TypographyH3, TypographyP } from "@/components/ui/Typography";
import { Button } from "../ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fakeVoices } from "@/constants";

interface Props {
  data: Voice[];
}

function VoiceTable({ dat }: Props) {
  const [data] = useState(fakeVoices);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const columns: ColumnDef<Voice>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <div className="w-36 font-medium">{getValue() as string}</div>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ getValue }) => (
          <div className="capitalize">{getValue() as string}</div>
        ),
      },
      {
        accessorKey: "accent",
        header: "Accent",
        cell: ({ getValue }) => (
          <div className="capitalize">{getValue() as string}</div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ getValue }) => {
          const description = getValue() as string;

          return (
            <div>
              <Tooltip>
                <TooltipTrigger className="align-middle">
                  <p className="line-clamp-4 text-left leading-snug text-ellipsis lg:line-clamp-2">
                    {description}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-[600px]">
                  {description}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
      {
        accessorKey: "previewUrl",
        header: "Preview",
        cell: ({ getValue }) => {
          const url = getValue() as string;
          const isPlaying = currentPlayingUrl === url;

          function handleClick() {
            if (isPlaying) {
              audioRef.current?.pause();
              setCurrentPlayingUrl(null);
              audioRef.current = null;
            } else {
              if (audioRef.current) {
                audioRef.current.pause();
              }

              const newAudio = new Audio(url);
              audioRef.current = newAudio;
              newAudio.play();
              setCurrentPlayingUrl(url);

              newAudio.onended = () => {
                setCurrentPlayingUrl(null);
                audioRef.current = null;
              };
            }
          }

          return (
            <div>
              <Button size="sm" onClick={handleClick}>
                {isPlaying ? (
                  <Pause strokeWidth={2.5} />
                ) : (
                  <Play strokeWidth={2.5} />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [currentPlayingUrl],
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      <TypographyH3>Available voices</TypographyH3>
      <TypographyP className="text-muted-foreground !my-3">
        Last updated at{" "}
        {dayjs(data[0]?.createdAt).format(
          "dddd, MMM DD YYYY - HH:mm:ss A UTCZ",
        )}
      </TypographyP>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              ></TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>
              <div className="flex flex-col items-center justify-between px-2 max-md:gap-3 max-md:p-0 max-sm:items-start md:flex-row">
                <div className="text-muted-foreground flex-1 text-sm max-sm:self-start">
                  Total {table.getRowCount()} items. Filter return{" "}
                  {table.getFilteredRowModel().rows.length} result(s).
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex flex-col items-center space-x-2 max-sm:gap-2 sm:flex-row">
                    <p className="min-w-25 text-sm font-medium">
                      Rows per page
                    </p>
                    <Select
                      value={`${table.getState().pagination.pageSize}`}
                      onValueChange={(value) => {
                        table.setPageSize(Number(value));
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue
                          placeholder={table.getState().pagination.pageSize}
                        />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[1, 10, 20, 25, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">Go to first page</span>
                      <ChevronsLeft />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">Go to previous page</span>
                      <ChevronLeft />
                    </Button>
                    {/* render list of number buttons */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">Go to next page</span>
                      <ChevronRight />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() =>
                        table.setPageIndex(table.getPageCount() - 1)
                      }
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">Go to last page</span>
                      <ChevronsRight />
                    </Button>
                  </div>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default VoiceTable;
