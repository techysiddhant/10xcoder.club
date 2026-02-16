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

  const { mutateAsync: updateResourceMutation, isPending: isUpdatingResource } =
    useMutation({
      mutationFn: (resource: ResourceCreateClient) =>
        updateResource(resourceId, resource),
    });

  const handleSubmit = async (value: ResourceCreateClient) => {
    try {
      await updateResourceMutation(value);
      toast.success("Resource updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["user-submissions"] });
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
