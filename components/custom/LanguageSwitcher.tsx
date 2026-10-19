"use client";

import { Check, Languages } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n/provider";
import { locales } from "@/lib/i18n/config";

const names = { en: "English", vi: "Tiếng Việt" };

export function HeaderUserButton() {
  const { locale, setLocale } = useI18n();

  return (
    <UserButton>
      <UserButton.MenuItems>
        {locales.map((value) => (
          <UserButton.Action
            key={value}
            label={names[value]}
            labelIcon={
              locale === value ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Languages className="size-4" aria-hidden="true" />
              )
            }
            onClick={() => setLocale(value)}
          />
        ))}
      </UserButton.MenuItems>
    </UserButton>
  );
}
