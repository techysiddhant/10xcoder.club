"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import ThemeToggle from "@/components/theme-toggle";
import AdminSidebar from "@/components/admin/admin-sidebar";

type AdminLayoutProps = {
  children: React.ReactNode;
  /**
   * Optional header title override. If omitted, title is derived from route.
   */
  title?: string;
};

const routeTitleMap: Record<string, string> = {
  "/admin": "Admin Panel",
  "/admin/users": "User Management",
  "/admin/resources": "Resources Management",
  "/admin/analytics": "Analytics",
  "/admin/reports": "Reports",
  "/admin/reported-issues": "Reported Issues",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
};

const toTitleCase = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const pathname = usePathname();
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
  const derivedTitle =
    routeTitleMap[pathname] ??
    (lastSegment ? toTitleCase(lastSegment) : "Admin Panel");
  const headerTitle = title ?? derivedTitle;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur [@supports(backdrop-filter)]:bg-background/60 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-semibold text-foreground">
                {headerTitle}
              </span>
            </div>
            <ThemeToggle />
          </header>
          <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
