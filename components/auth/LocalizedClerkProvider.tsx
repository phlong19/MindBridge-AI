"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { enUS } from "@clerk/localizations/en-US";
import { viVN } from "@clerk/localizations/vi-VN";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";

export default function LocalizedClerkProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { locale } = useI18n();
  return (
    <ClerkProvider
      localization={locale === "vi" ? viVN : enUS}
      appearance={{ variables: { colorPrimary: "#fe5933" } }}
    >
      {children}
    </ClerkProvider>
  );
}
