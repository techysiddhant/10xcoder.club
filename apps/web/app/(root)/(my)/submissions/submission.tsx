"use client";

import UserSubmissions from "@/components/submissions/user-submissions";
import { useDebounce } from "@/hooks/use-debounce";
import { authClient } from "@/lib/auth-client";
import { getUserSubmissions, resourceOptions } from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ArrowLeft, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { useLayoutEffect } from "react";

const Submission = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [selectedTypes, setSelectedTypes] = useQueryState(
    "resourceType",
    parseAsString.withDefault("all"),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(10),
  );
  const [selectedStatus, setSelectedStatus] = useQueryState(
    "status",
    parseAsStringEnum(["approved", "rejected", "pending", "all"]).withDefault(
      "all",
    ),
  );

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: session, isPending } = authClient.useSession();

  useLayoutEffect(() => {
    if (!session && !isPending) {
      router.push("/auth?mode=signin&redirectUrl=/submissions");
    }
  }, [session, isPending, router]);

  const {
    data: submissions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "user-submissions",
      page,
      limit,
      selectedStatus,
      debouncedSearch,
      selectedTypes,
    ],
    queryFn: async () => {
      const res = await getUserSubmissions({
        page,
        limit,
        status: selectedStatus,
        search: debouncedSearch,
        resourceType: selectedTypes,
      });
      return res.data;
    },
    enabled: !!session,
  });
  const { data: optionsData } = useQuery({
    queryKey: ["resourceOptions"],
    queryFn: async () => {
      const res = await resourceOptions();
      return (
        res.data as {
          data: {
            resourceTypes: { id: string; name: string; label: string }[];
            tags: { id: string; name: string }[];
            techStack: { id: string; name: string }[];
          };
        }
      ).data;
    },
  });

  // Auth guard: resolve session before showing data UI
  if (isPending) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (isLoading) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Skeleton className="h-9 w-32 mb-4 rounded-md" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive" className="rounded-lg">
            <AlertTitle>Failed to load submissions</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Something went wrong. Please try again."}
            </AlertDescription>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/profile")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>

          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                My Submissions
              </h1>
              <p className="text-muted-foreground">
                View and manage all resources you've submitted
              </p>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <UserSubmissions
          data={
            submissions ?? {
              data: [],
              kpis: {
                total: 0,
                approved: 0,
                pending: 0,
                rejected: 0,
              },
              meta: { total: 0, page: page, limit: limit },
            }
          }
          // onEdit={handleEdit}
          // onDelete={handleDelete}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTypes={selectedTypes}
          setSelectedTypes={setSelectedTypes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          resourceTypes={optionsData?.resourceTypes ?? []}
        />
      </div>
    </main>
  );
};

export default Submission;
