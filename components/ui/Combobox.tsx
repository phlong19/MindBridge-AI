"use client";

import { CheckIcon, ChevronsUpDownIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./Command";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

interface Props {
  data: { label: string; value: string }[];
  updateFilter?: (arg0?: string) => void;
  currentValue?: string;
  name?: string;
  clearable?: boolean;
}

export function Combobox({
  data,
  updateFilter,
  currentValue,
  name = "voice",
  clearable = false,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild isOpen={open}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between capitalize"
        >
          {currentValue
            ? data.find((item) => item.value === currentValue)?.label
            : `Select ${name}...`}
          {clearable && currentValue ? (
            <div
              className="hover:text-primary pointer-events-auto"
              title="Clear"
              onClick={(e) => {
                e.stopPropagation();
                updateFilter?.("");
              }}
            >
              <X className="ml-2 h-4 w-4 shrink-0" />
            </div>
          ) : (
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${name}...`} />
          <CommandList style={{ scrollbarWidth: "thin" }}>
            <CommandEmpty>No {name} found.</CommandEmpty>
            <CommandGroup>
              {data.map(({ label, value }) => (
                <CommandItem
                  className={cn(
                    "capitalize",
                    value === currentValue && "bg-primary text-white",
                  )}
                  key={value}
                  value={value}
                  onSelect={(val) => {
                    setOpen(false);
                    updateFilter?.(val === currentValue ? "" : val);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currentValue
                        ? "stroke-white opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
