"use client";
import { ResourceCreateClient } from "@/lib/schema";
import { ResourceAutoFillData } from "@workspace/database";
import { createResource } from "@/lib/http";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import ResourceFormCore from "./resource-form-core";

interface CreateResourceFormProps {
  resourceAutoFillData: ResourceAutoFillData;
  onPendingChange?: (pending: boolean) => void;
}

const CreateResourceForm = ({
  resourceAutoFillData,
  onPendingChange,
}: CreateResourceFormProps) => {
  const router = useRouter();
  const {
    mutateAsync: createResourceMutation,
    isPending: isCreateResourceLoading,
  } = useMutation({
    mutationFn: (resource: ResourceCreateClient) =>
      createResource({
        ...resource,
      }),
  });

  const handleSubmit = async (value: ResourceCreateClient) => {
    try {
      const response = await createResourceMutation(value);
      toast.success("Resource added successfully");
      const id = response.data?.id;
      if (id) {
        router.push(`/resources/${id}`);
      } else {
        router.push("/submissions");
      }
    } catch {
      toast.error("Failed to create resource. Please try again.");
    }
  };

  return (
    <ResourceFormCore
      initialValues={resourceAutoFillData}
      onPendingChange={onPendingChange}
      isSubmitting={isCreateResourceLoading}
      onSubmit={handleSubmit}
    />
  );
};

export default CreateResourceForm;
