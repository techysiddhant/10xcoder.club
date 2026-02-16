"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ResourceAutoFillData } from "@workspace/database";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ResourceCreateClient } from "@/lib/schema";
import { updateResource } from "@/lib/http";
import ResourceFormCore from "./resource-form-core";

type EditResourceFormProps = {
  resourceId: string;
  initialValues: ResourceAutoFillData;
  onPendingChange?: (pending: boolean) => void;
  onSuccess?: () => void;
  formId?: string;
};

const EditResourceForm = ({
  resourceId,
  initialValues,
  onPendingChange,
  onSuccess,
  formId = "edit-resource-details-form",
}: EditResourceFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const patchResourceCache = (
    queryKey: readonly unknown[],
    value: ResourceCreateClient,
  ) => {
    queryClient.setQueryData(queryKey, (existing: any) => {
      if (!existing || typeof existing !== "object") {
        return existing;
      }
      return {
        ...existing,
        title: value.title,
        description: value.description,
        image: value.image,
        credits: value.credits,
        resourceType: value.resourceType,
        language: value.language,
        url: value.url,
      };
    });
  };

  const { mutateAsync: updateResourceMutation, isPending: isUpdatingResource } =
    useMutation({
      mutationFn: (resource: ResourceCreateClient) =>
        updateResource(resourceId, resource),
    });

  const handleSubmit = async (value: ResourceCreateClient) => {
    try {
      await updateResourceMutation(value);
      patchResourceCache(["resource-detail-edit", resourceId], value);
      patchResourceCache(["resource-detail", resourceId], value);
      patchResourceCache(["resource", resourceId], value);
      toast.success("Resource updated successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-submissions"] }),
        queryClient.invalidateQueries({
          queryKey: ["resource-detail-edit", resourceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["resource-detail", resourceId],
        }),
      ]);
      onSuccess?.();
      if (!onSuccess) {
        router.push("/submissions");
      }
    } catch {
      toast.error("Failed to update resource. Please try again.");
    }
  };

  return (
    <ResourceFormCore
      formId={formId}
      initialValues={initialValues}
      onPendingChange={onPendingChange}
      isSubmitting={isUpdatingResource}
      onSubmit={handleSubmit}
    />
  );
};

export default EditResourceForm;
