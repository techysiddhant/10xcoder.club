import ResourceDetail from "./resource-detail";

const ResourcePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  return <ResourceDetail id={id} />;
};

export default ResourcePage;
