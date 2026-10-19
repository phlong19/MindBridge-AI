"use client";

import { useI18n } from "@/lib/i18n/provider";
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
  const { t } = useI18n();
  useEffect(() => {
    if (title) {
      toast.error(t(title), {
        ...getToastStyle(type),
        description: message ? t(message) : undefined,
      });
    }
  }, [title, message, type, t]);

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
