"use client";

import React from "react";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import ThemeToggle from "@/components/theme-toggle";
import AdminSidebar from "@/components/admin/admin-sidebar";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-semibold text-foreground">
                Resources Management
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
