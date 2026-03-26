import React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { QueryProvider } from "@/components/providers/query-provider";
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryProvider>
      <div className="bg-background min-h-dvh">
        <Header />
        <div className="pt-10 sm:pt-16">{children}</div>
        <Footer />
      </div>
    </QueryProvider>
  );
};

export default RootLayout;
