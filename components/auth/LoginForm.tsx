"use client";

import Loading from "@/components/custom/Loading";
import { SignIn, useAuth, useSignIn } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";
import { getToastStyle } from "@/lib/utils";

type LoginFormProps = {
  testCredentials: { email: string; password: string } | null;
};

const LoginForm = ({ testCredentials }: LoginFormProps) => {
  const { isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const showToast = document.cookie.includes("authorization=1");

    if (showToast) {
      toast.error(errorMessage.notAuthorized, getToastStyle("warning"));
      document.cookie = "Max-Age=0; Path=/";
    }
  }, []);

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
        toast.error("The test account needs another sign-in step.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      window.location.assign("/");
    } catch {
      toast.error("Could not sign in with the test account. Check its Clerk credentials.");
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
          className="rounded-md bg-primary px-4 py-2 text-sm cursor-pointer hover:bg-primary/85 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningIn}
          onClick={signInWithTestAccount}
          type="button"
        >
          {isSigningIn ? "Signing in…" : "Sign in as Test Account"}
        </button>
      )}
      <SignIn />
    </main>
  );
};

export default LoginForm;
