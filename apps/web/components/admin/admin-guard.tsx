"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const AdminGuard = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const role = session?.user?.role?.toUpperCase();

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session?.user) {
      const redirectUrl = encodeURIComponent(pathname || "/admin/resources");
      router.replace(`/auth?mode=signin&redirectUrl=${redirectUrl}`);
      return;
    }

    if (role !== "ADMIN") {
      router.replace("/");
    }
  }, [isPending, pathname, role, router, session]);

  if (isPending || !session?.user || role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
