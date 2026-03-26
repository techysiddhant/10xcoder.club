import React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { AppClientProviders } from "@/components/providers/app-client-providers";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppClientProviders>
      <div className="bg-background min-h-dvh">
        <Header />
        <div className="pt-10 sm:pt-16">{children}</div>
        <Footer />
      </div>
    </AppClientProviders>
  );
};

export default RootLayout;
