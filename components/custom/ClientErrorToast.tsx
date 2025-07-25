"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const ClientErrorToast = ({
  error,
  errorDescription,
}: {
  error: string;
  errorDescription: string;
}) => {
  useEffect(() => {
    if (error) {
      toast.error(error, { description: errorDescription });
    }
  }, [error, errorDescription]);

  return null;
};

export default ClientErrorToast;
