import React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-background min-h-dvh">
      <Header />
      {children}
      <Footer />
    </div>
  );
};

export default RootLayout;
