"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/Button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function GoBackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      className={cn("!px-0", className)}
      onClick={() => router.back()}
      variant="link"
    >
      <ArrowLeft />
      Go back
    </Button>
  );
}

export default GoBackButton;
