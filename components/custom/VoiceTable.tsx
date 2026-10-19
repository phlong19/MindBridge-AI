"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
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
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
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
  Columns3Cog,
  Pause,
  Play,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ChevronUpDown from "./SortingChevrons";
import { Input } from "../ui/Input";
import { Voice } from "@/types";
import { Combobox } from "../ui/Combobox";
import { toast } from "sonner";
import { error } from "@/constants/message";
import { getToastStyle } from "@/lib/utils";

interface Props {
  data: Voice[];
  lastUpdated?: string;
}

function VoiceTable({ data, lastUpdated }: Props) {
  const { t } = useI18n();
  const [nameFilter, setNameFilter] = useState("");
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(
    null,
  );
  const [sorting, setSorting] = useState<SortingState>([
    { desc: false, id: "name" },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const accentList = useMemo(() => {
    return Array.from(
      new Map(
        data
          .filter((i): i is Voice & { accent: string } => !!i.accent)
          .map(({ accent }) => [
            accent,
            { label: accent, value: accent.toLowerCase() },
          ]),
      ).values(),
    );
  }, [data]);

  const columns = useMemo<ColumnDef<Voice>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            className="!px-0"
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <LocalizedText>Name</LocalizedText>{" "}
            <ChevronUpDown sorting={column.getIsSorted()} />
          </Button>
        ),
        cell: ({ getValue }) => (
          <div className="w-36 font-medium">{getValue() as string}</div>
        ),
      },
      {
        accessorKey: "gender",
        header: t("Gender"),
        cell: ({ getValue }) => (
          <div className="capitalize">{t(getValue() as string)}</div>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "accent",
        header: t("Accent"),
        cell: ({ getValue }) => (
          <div className="capitalize">{t(getValue() as string)}</div>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "style",
        header: t("Style"),
        cell: ({ getValue }) => (
          <div className="capitalize">{t(getValue() as string)}</div>
        ),
      },
      {
        accessorKey: "description",
        header: t("Description"),
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
        header: t("Preview"),
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

              newAudio.onerror = () => {
                setCurrentPlayingUrl(null);
                audioRef.current = null;
                toast.error(
                  t(error.cantPlayVoicePreview),
                  getToastStyle("error"),
                );
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
    [currentPlayingUrl, t],
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
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const totalLength = data.length;
  const currentGenderFilter = table
    .getColumn("gender")
    ?.getFilterValue() as string;
  const currentAccentFilter = table
    .getColumn("accent")
    ?.getFilterValue() as string;

  function updateNameFilter(query?: string) {
    const value = query ?? "";
    setNameFilter(value);
    table.getColumn("name")?.setFilterValue(value);
  }

  function updateAccentFilter(query?: string) {
    table.getColumn("accent")?.setFilterValue(query);
  }

  function updateGenderFilter(query?: string) {
    table.getColumn("gender")?.setFilterValue(query);
  }

  return (
    <div>
      <div>
        <TypographyH3>
          <LocalizedText>Available voices</LocalizedText>
        </TypographyH3>

        <TypographyP className="text-muted-foreground !mt-0 !mb-3">
          <LocalizedText>Last updated at</LocalizedText> {lastUpdated}
        </TypographyP>
      </div>
      <div className="flex w-full flex-col items-center gap-2 md:mb-3 md:flex-row">
        {/* filter & search */}
        <div className="flex w-full items-center gap-2">
          {/* accent */}
          <div className="grow">
            <Combobox
              clearable
              data={accentList}
              updateFilter={updateAccentFilter}
              currentValue={currentAccentFilter}
            />
          </div>
          {/* gender */}
          <div className="w-[150px] min-w-[150px] md:w-[150px] md:min-w-[150px]">
            <Combobox
              searchable={false}
              name="gender"
              data={[
                { label: t("Male"), value: "male" },
                { label: t("Female"), value: "female" },
              ]}
              clearable
              currentValue={currentGenderFilter}
              updateFilter={updateGenderFilter}
            />
          </div>
        </div>

        <div className="flex w-full grow items-center gap-2 max-md:mb-2.5">
          {/* search input */}
          <div className="relative grow min-xl:w-full">
            <Input
              placeholder={t("Filter by name...")}
              value={nameFilter}
              onChange={(e) => updateNameFilter(e.target.value)}
            />
            {!!nameFilter.length && (
              <Tooltip>
                <TooltipTrigger className="absolute top-1/2 right-[1px] -translate-y-1/2 rounded-l-[0]">
                  <div
                    className="hover:bg-accent flex size-[34px] cursor-pointer items-center justify-center rounded-sm bg-transparent p-[5px] transition-all duration-200"
                    onClick={() => updateNameFilter()}
                  >
                    <X size={16} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <LocalizedText>Clear</LocalizedText>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* columns visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="focus-visible:border-inherit focus-visible:ring-0"
              >
                <Columns3Cog
                  stroke={
                    Object.values(table.getState().columnVisibility).some(
                      (i) => !i,
                    )
                      ? "var(--primary)"
                      : "currentColor"
                  }
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={t(column.id)}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {t(column.id)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <LocalizedText>No results.</LocalizedText>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6}>
              <div className="flex flex-col items-center justify-between px-2 max-md:gap-3 max-md:p-0 max-sm:items-start md:flex-row">
                <div className="text-muted-foreground flex-1 text-sm max-sm:self-start">
                  <LocalizedText>Total</LocalizedText> {totalLength}{" "}
                  <LocalizedText>items. Showing</LocalizedText>{" "}
                  {table.getFilteredRowModel().rows.length}{" "}
                  <LocalizedText>result(s).</LocalizedText>
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex flex-col items-center space-x-2 max-sm:gap-2 sm:flex-row">
                    <p className="min-w-25 text-sm font-medium">
                      <LocalizedText>Rows per page</LocalizedText>
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
                    <LocalizedText>Page</LocalizedText>{" "}
                    {table.getState().pagination.pageIndex + 1}{" "}
                    <LocalizedText>of</LocalizedText> {table.getPageCount()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">
                        <LocalizedText>Go to first page</LocalizedText>
                      </span>
                      <ChevronsLeft />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">
                        <LocalizedText>Go to previous page</LocalizedText>
                      </span>
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
                      <span className="sr-only">
                        <LocalizedText>Go to next page</LocalizedText>
                      </span>
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
                      <span className="sr-only">
                        <LocalizedText>Go to last page</LocalizedText>
                      </span>
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
