import { SignIn } from "@clerk/nextjs";
import React from "react";

const Page = () => {
  return (
    <main className="mt-20 flex items-center justify-center">
      <SignIn />
    </main>
  );
};

export default Page;
