"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  console.log(props);
  const type = props.className;

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster group", type === "error" ? "" : "")}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
