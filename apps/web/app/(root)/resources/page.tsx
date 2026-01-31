import CreateResource from "@/components/resources/create-resource";
import { Suspense } from "react";

const ResourcesPage = () => {
  return (
    <div className="mt-24">
      ResourcesPage
      <Suspense fallback={<div>Loading...</div>}>
        <CreateResource />
      </Suspense>
    </div>
  );
};

export default ResourcesPage;
