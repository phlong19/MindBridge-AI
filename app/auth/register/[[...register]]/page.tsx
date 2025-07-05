import { SignUp } from "@clerk/nextjs";
import React from "react";

const Page = () => {
  return (
    <div className="mt-20 flex items-center justify-center">
      <SignUp />
    </div>
  );
};

export default Page;
