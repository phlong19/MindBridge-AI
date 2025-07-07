"use client";

import Loading from "@/components/custom/Loading";
import { SignIn, useAuth } from "@clerk/nextjs";
import React from "react";

const Page = () => {
  const { isLoaded } = useAuth();

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
