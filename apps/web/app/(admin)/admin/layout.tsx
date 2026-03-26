import React from "react";
import AdminShellLayout from "@/components/admin/admin-layout";
import AdminGuard from "@/components/admin/admin-guard";
import { AppClientProviders } from "@/components/providers/app-client-providers";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppClientProviders>
      <AdminGuard>
        <AdminShellLayout>{children}</AdminShellLayout>
      </AdminGuard>
    </AppClientProviders>
  );
};

export default AdminLayout;
