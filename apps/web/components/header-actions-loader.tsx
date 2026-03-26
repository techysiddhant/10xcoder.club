"use client";

import dynamic from "next/dynamic";

const HeaderActions = dynamic(() => import("./header-actions"), {
  ssr: false,
  loading: () => <div className="w-24 h-9 rounded-md bg-muted/60" />,
});

export default HeaderActions;
