"use client";

import { useEffect } from "react";
import SignInForm from "@/components/auth/signin-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { useQueryState } from "nuqs";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const AuthPage = () => {
  const [mode, setMode] = useQueryState("mode");
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (session && !isPending) {
      router.push("/");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // If already logged in, show loading while redirecting
  if (session) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md space-y-6">
        {mode === "signin" ? (
          <SignInForm onSwitchMode={() => setMode("signup")} />
        ) : (
          <SignUpForm onSwitchMode={() => setMode("signin")} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
