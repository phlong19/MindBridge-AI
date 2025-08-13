"use client";

import { getToastStyle, ToastTypes } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

interface MessageProps {
  title: string;
  message?: string;
  type?: ToastTypes;
}

interface RedirectWithDelayProps extends MessageProps {
  redirectTo: string;
  delay?: number;
}

export const ClientToast = ({
  title,
  message,
  type = "error",
}: MessageProps) => {
  useEffect(() => {
    if (title) {
      toast.error(title, {
        ...getToastStyle(type),
        description: message,
      });
    }
  }, [title, message, type]);

  return null;
};

export const RedirectWithToast = ({
  title,
  message,
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

  return <ClientToast title={title} message={message} />;
};
