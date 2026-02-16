import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShellLayout from "@/components/admin/admin-layout";
import { serverEnv } from "@/env/server";

type AdminSession = {
  user?: {
    role?: string;
  } | null;
} | null;

async function getAdminSession(): Promise<AdminSession> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${serverEnv.API_URL}/api/auth/get-session`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const session = (await response.json()) as AdminSession;
    return session;
  } catch (error) {
    console.error("Failed to fetch admin session:", error);
    return null;
  }
}

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getAdminSession();

  if (!session?.user) {
    redirect("/auth?mode=signin&redirectUrl=/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <AdminShellLayout>{children}</AdminShellLayout>;
};

export default AdminLayout;
