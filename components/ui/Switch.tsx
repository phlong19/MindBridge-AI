"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";
import { Label } from "./Label";

interface Props extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  rightLabel?: string;
  leftLabel?: string;
}

function Switch({
  className,
  leftLabel,
  rightLabel,
  checked,
  ...props
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={props.id}
        className={`text-sm font-semibold ${!checked ? "text-primary" : "text-muted-foreground"}`}
      >
        {leftLabel}
      </Label>
      <SwitchPrimitive.Root
        checked={checked}
        data-slot="switch"
        className={cn(
          "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          )}
        />
      </SwitchPrimitive.Root>
      <Label
        htmlFor={props.id}
        className={`text-sm font-semibold ${checked ? "text-primary" : "text-muted-foreground"}`}
      >
        {rightLabel}
      </Label>
    </div>
  );
}

export default Switch;
