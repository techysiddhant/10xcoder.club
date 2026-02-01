import CreateResource from "@/components/resources/create-resource";
import { Suspense } from "react";
import Resources from "./resources";

const ResourcesPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Resources />
    </Suspense>
  );
};

export default ResourcesPage;
