import { SignUp } from "@clerk/nextjs";
import React from "react";
import { getSafeReturnPath } from "@/lib/auth-redirect";
import { headers } from "next/headers";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) => {
  const { redirect_url } = await searchParams;
  const requestHeaders = await headers();
  const origin = `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${requestHeaders.get("host") ?? "localhost"}`;
  const returnPath = getSafeReturnPath(redirect_url, origin);
  return (
    <div className="mt-20 flex items-center justify-center">
      <SignUp
        forceRedirectUrl={returnPath}
        signInForceRedirectUrl={returnPath}
      />
    </div>
  );
};

export default Page;
