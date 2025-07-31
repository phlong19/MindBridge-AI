"use client";

import { getToastStyle } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

interface MessageProps {
  error: string;
  errorDescription: string;
}

interface RedirectWithDelayProps extends MessageProps {
  redirectTo: string;
  delay: number;
}

export const ClientErrorToast = ({ error, errorDescription }: MessageProps) => {
  useEffect(() => {
    if (error) {
      toast.error(error, {
        ...getToastStyle("error"),
        description: errorDescription,
      });
    }
  }, [error, errorDescription]);

  return null;
};

export const RedirectWithToast = ({
  error,
  errorDescription,
  redirectTo,
  delay = 2000,
}: RedirectWithDelayProps) => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(redirectTo);
    }, delay);

    return () => clearTimeout(timer);
  }, [redirectTo, delay, router]);

  return <ClientErrorToast error={error} errorDescription={errorDescription} />;
};
