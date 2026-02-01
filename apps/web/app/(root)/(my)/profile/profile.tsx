"use client";

import ProfileDetails from "@/components/profile/profile-details";
import ProfileEmail from "@/components/profile/profile-email";
import ProfilePicture from "@/components/profile/profile-picture";
import ProfileQuickLinks from "@/components/profile/profile-quicklinks";
import { authClient } from "@/lib/auth-client";
import { User } from "@workspace/database";
import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
const Profile = () => {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();
  useLayoutEffect(() => {
    if (!session && !isPending) {
      router.push("/auth?mode=signin&redirectUrl=/profile");
    }
  }, [session, isPending, router]);

  // Show loading skeleton while session is resolving; only treat as unauthenticated once not pending
  if (isPending) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and profile information
          </p>
        </div>
        <div className="space-y-6">
          <ProfilePicture user={user as User} />
          <ProfileEmail user={user as User} />
          <ProfileDetails user={user as User} />
          <ProfileQuickLinks />
        </div>
      </div>
    </main>
  );
};

export default Profile;
