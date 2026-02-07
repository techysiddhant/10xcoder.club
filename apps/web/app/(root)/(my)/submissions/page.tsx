import React, { Suspense } from "react";
import type { Metadata } from "next";
import Submission from "./submission";

export const metadata: Metadata = {
  title: "My Submissions",
  description: "View and manage your submitted resources on 10xCoder.club.",
};

const SubmissionsPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Submission />
    </Suspense>
  );
};

export default SubmissionsPage;
