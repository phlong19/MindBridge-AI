"use client";

import Loading from "@/components/custom/Loading";
import { PricingTable, useUser } from "@clerk/nextjs";

const Page = () => {
  const { isLoaded, user } = useUser();

  if (!isLoaded && !user) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto mt-40">
      <PricingTable />
    </div>
  );
};

export default Page;
