import React, { Suspense } from "react";
import Submission from "./submission";

const SubmissionsPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Submission />
    </Suspense>
  );
};

export default SubmissionsPage;
