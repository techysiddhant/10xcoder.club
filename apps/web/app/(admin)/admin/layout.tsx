import React from "react";
import AdminShellLayout from "@/components/admin/admin-layout";
import AdminGuard from "@/components/admin/admin-guard";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AdminGuard>
      <AdminShellLayout>{children}</AdminShellLayout>
    </AdminGuard>
  );
};

export default AdminLayout;
