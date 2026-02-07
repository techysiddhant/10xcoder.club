import CreateResource from "@/components/resources/create-resource";
import { Suspense } from "react";
import Resources from "./resources";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Browse curated developer resources — articles, videos, courses, tools, and templates. Filter by type, tag, and tech stack.",
};

const ResourcesPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Resources />
    </Suspense>
  );
};

export default ResourcesPage;
