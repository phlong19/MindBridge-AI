import LoginForm from "@/components/auth/LoginForm";

const Page = () => {
  const testCredentials =
    process.env.NODE_ENV === "development" &&
    process.env.TEST_ACCOUNT_EMAIL &&
    process.env.TEST_ACCOUNT_PASSWORD
      ? {
          email: process.env.TEST_ACCOUNT_EMAIL,
          password: process.env.TEST_ACCOUNT_PASSWORD,
        }
      : null;

  return <LoginForm testCredentials={testCredentials} />;
};

export default Page;
