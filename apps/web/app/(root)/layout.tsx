import React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-background min-h-dvh">
      <Header />
      {/* Spacer: on mobile notice ~5rem + navbar 4rem; on sm+ notice 3rem + navbar 4rem */}
      <div className="pt-36 sm:pt-28">{children}</div>
      <Footer />
    </div>
  );
};

export default RootLayout;
