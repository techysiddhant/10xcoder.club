"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ResourceAutoFillData } from "@workspace/database";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { authClient } from "@/lib/auth-client";
import { getResourceById } from "@/lib/http";
import EditResourceForm from "@/components/resources/edit-resource-form";

const VALID_RESOURCE_TYPES = new Set(["video", "blog", "tool", "repo"]);
const VALID_LANGUAGES = new Set(["english", "hindi"]);

const toEditableValues = (resource: any): ResourceAutoFillData => {
  const resourceType = VALID_RESOURCE_TYPES.has(resource?.resourceType)
    ? resource.resourceType
    : "blog";
  const language = VALID_LANGUAGES.has(resource?.language)
    ? resource.language
    : "english";

  return {
    title: resource?.title ?? "",
    description: resource?.description ?? "",
    url: resource?.url ?? "",
    image: resource?.image ?? "",
    credits: resource?.credits ?? "",
    resourceType,
    language,
    tags: Array.isArray(resource?.tags)
      ? resource.tags
          .map((tag: any) => (typeof tag === "string" ? tag : tag?.name))
          .filter(Boolean)
      : [],
    techStack: Array.isArray(resource?.techStack)
      ? resource.techStack
          .map((item: any) => (typeof item === "string" ? item : item?.name))
          .filter(Boolean)
      : [],
    _meta: {
      platform: "generic",
      method: "og_meta",
      cached: true,
    },
  } as ResourceAutoFillData;
};

const EditResourcePage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const resourceId = params?.id ?? "";
  const [isFormPending, setIsFormPending] = useState(false);

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  useEffect(() => {
    if (!isSessionPending && !session?.user) {
      router.push(
        `/auth?mode=signin&redirectUrl=/resources/${resourceId}/edit`,
      );
    }
  }, [isSessionPending, resourceId, router, session?.user]);

  const {
    data: resourceResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["resource-detail-edit", resourceId],
    queryFn: async () => {
      const response = await getResourceById(resourceId);
      return response.data?.data;
    },
    enabled: !!session?.user && !!resourceId,
  });

  const resource = resourceResponse;
  const ownerId =
    resource?.creator?.id ?? resource?.addedBy?.id ?? resource?.createdBy ?? "";
  const sessionUserId =
    (session?.user as { id?: string } | undefined)?.id ?? "";
  const isOwner = Boolean(
    sessionUserId && ownerId && ownerId === sessionUserId,
  );
  const isEditable =
    resource && !resource.isPublished && resource.status !== "approved";
  const initialValues = useMemo(
    () => (resource ? toEditableValues(resource) : null),
    [resource],
  );

  if (isSessionPending || (session?.user && isLoading)) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading resource...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (isError) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Failed to load resource</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Something went wrong."}
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (!resource || !initialValues) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Resource not found</AlertTitle>
            <AlertDescription>
              This resource does not exist or is no longer available.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Not authorized</AlertTitle>
            <AlertDescription>
              You can only edit resources that you submitted.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (!isEditable) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Alert>
            <AlertTitle>Editing unavailable</AlertTitle>
            <AlertDescription>
              Approved or published resources cannot be edited.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/submissions")}
            >
              Back to Submissions
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/submissions")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Submissions
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Edit Resource</h1>
          <p className="text-muted-foreground mt-2">
            Update your resource details and resubmit for review.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EditResourceForm
              resourceId={resourceId}
              initialValues={initialValues}
              onPendingChange={setIsFormPending}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/submissions")}
                disabled={isFormPending}
                className="sm:w-40"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-resource-details-form"
                disabled={isFormPending}
                className="sm:w-40"
              >
                {isFormPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default EditResourcePage;
