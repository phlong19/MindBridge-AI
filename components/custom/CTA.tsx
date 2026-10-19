"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import React from "react";
import { Button } from "../ui/Button";
import Image from "next/image";
import Link from "next/link";
import { navLinks } from "@/constants";
import { cn } from "@/lib/utils";

const CTA = ({ className }: { className?: string }) => {
  const { t } = useI18n();
  return (
    <section className={cn("cta-section", className)}>
      <div className="cta-badge">
        <LocalizedText>Learning as the way you want</LocalizedText>
      </div>
      <h2 className="text-2xl font-bold">
        <LocalizedText>Build and Personalize Learning Companion</LocalizedText>
      </h2>
      <p>
        <LocalizedText>
          Pick a name, subject, voice & personality - and start learning through
          voice conversations that feel truly nature and joy.
        </LocalizedText>
      </p>
      <Image
        loading="lazy"
        src="/images/cta.svg"
        alt={t("cta")}
        width={0}
        height={0}
        style={{ width: 360, height: 230 }}
      />
      <Link href={navLinks.newCompanion.href}>
        <Button className="flex items-baseline">
          <Image
            src="/icons/plus.svg"
            alt={t("add")}
            width={0}
            height={0}
            style={{ width: 12, height: 12 }}
          />
          <p>
            <LocalizedText>Build a new Companion</LocalizedText>
          </p>
        </Button>
      </Link>
    </section>
  );
};

export default CTA;
