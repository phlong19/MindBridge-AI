import LoginForm from "@/components/auth/LoginForm";
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
  const testCredentials =
    process.env.NODE_ENV === "development" &&
    process.env.TEST_ACCOUNT_EMAIL &&
    process.env.TEST_ACCOUNT_PASSWORD
      ? {
          email: process.env.TEST_ACCOUNT_EMAIL,
          password: process.env.TEST_ACCOUNT_PASSWORD,
        }
      : null;

  return (
    <LoginForm
      testCredentials={testCredentials}
      returnPath={getSafeReturnPath(redirect_url, origin)}
    />
  );
};

export default Page;
