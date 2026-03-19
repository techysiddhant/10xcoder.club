import React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { VoteStreamProvider } from "@/components/providers/vote-stream-provider";
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <VoteStreamProvider>
      <div className="bg-background min-h-dvh">
        <Header />
        <div className="pt-10 sm:pt-16">{children}</div>
        <Footer />
      </div>
    </VoteStreamProvider>
  );
};

export default RootLayout;
