"use client";

import { LocalizedText } from "@/lib/i18n/provider";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/Button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function GoBackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      className={cn("w-fit !px-0", className)}
      onClick={() => router.back()}
      variant="link"
    >
      <ArrowLeft />
      <LocalizedText>Go back</LocalizedText>
    </Button>
  );
}

function GoBackWrapper({ className }: { className?: string }) {
  return <GoBackButton className={className} />;
}

export default GoBackWrapper;

// export default GoBackButton;
