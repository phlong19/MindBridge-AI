"use client";

import { useI18n } from "@/lib/i18n/provider";
import Loading from "@/components/custom/Loading";
import { SignIn, useAuth, useSignIn } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";
import { getToastStyle } from "@/lib/utils";

type LoginFormProps = {
  testCredentials: { email: string; password: string } | null;
  returnPath: string;
};

const LoginForm = ({ testCredentials, returnPath }: LoginFormProps) => {
  const { t } = useI18n();
  const { isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const showToast = document.cookie.includes("authorization=1");

    if (showToast) {
      toast.error(t(errorMessage.notAuthorized), getToastStyle("warning"));
      document.cookie = "authorization=; Max-Age=0; Path=/";
    }
  }, [t]);

  const signInWithTestAccount = async () => {
    if (!testCredentials || !signIn || !setActive) return;

    setIsSigningIn(true);
    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: testCredentials.email,
        password: testCredentials.password,
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        toast.error(t("The test account needs another sign-in step."));
        return;
      }

      await setActive({ session: result.createdSessionId });
      window.location.assign(returnPath);
    } catch {
      toast.error(
        t(
          "Could not sign in with the test account. Check its Clerk credentials.",
        ),
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!isAuthLoaded || !isSignInLoaded) {
    return <Loading />;
  }

  return (
    <main className="mt-20 flex flex-col items-center justify-center gap-4">
      {testCredentials && (
        <button
          className="bg-primary hover:bg-primary/85 text-primary-foreground cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningIn}
          onClick={signInWithTestAccount}
          type="button"
        >
          {isSigningIn ? t("Signing in…") : t("Sign in as Test Account")}
        </button>
      )}
      <SignIn
        forceRedirectUrl={returnPath}
        signUpForceRedirectUrl={returnPath}
      />
    </main>
  );
};

export default LoginForm;
