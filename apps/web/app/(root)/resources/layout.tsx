import type { ReactNode } from "react";
import { VoteStreamProvider } from "@/components/providers/vote-stream-provider";

const ResourcesLayout = ({ children }: { children: ReactNode }) => {
  return <VoteStreamProvider>{children}</VoteStreamProvider>;
};

export default ResourcesLayout;
