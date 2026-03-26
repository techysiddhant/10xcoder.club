import type { ReactNode } from "react";
import { AppClientProviders } from "@/components/providers/app-client-providers";

const MyLayout = ({ children }: { children: ReactNode }) => {
  return <AppClientProviders>{children}</AppClientProviders>;
};

export default MyLayout;
