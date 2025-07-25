"use client";

import Loading from "@/components/custom/Loading";
import { SignIn, useAuth } from "@clerk/nextjs";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";

const Page = () => {
  const { isLoaded } = useAuth();

  useEffect(() => {
    const showToast = document.cookie.includes("authorization=1");

    if (showToast) {
      toast.error(errorMessage.notAuthorized);
      document.cookie = "Max-Age=0; Path=/";
    }
  }, []);

  if (!isLoaded) {
    return <Loading />;
  }

  return (
    <main className="mt-20 flex items-center justify-center">
      <SignIn />
    </main>
  );
};

export default Page;
