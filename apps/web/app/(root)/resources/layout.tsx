import type { ReactNode } from "react";
import { AppClientProviders } from "@/components/providers/app-client-providers";
import { VoteStreamProvider } from "@/components/providers/vote-stream-provider";

const ResourcesLayout = ({ children }: { children: ReactNode }) => {
  return (
    <AppClientProviders>
      <VoteStreamProvider>{children}</VoteStreamProvider>
    </AppClientProviders>
  );
};

export default ResourcesLayout;
