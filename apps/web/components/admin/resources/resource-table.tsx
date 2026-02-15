"use client";

import { useMemo, useState } from "react";
import {
  Check,
  X,
  ExternalLink,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import toast from "react-hot-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import {
  deleteAdminResource,
  getAdminResources,
  resourceOptions,
  updateAdminResourceStatus,
} from "@/lib/http";

type ResourceStatus = "pending" | "approved" | "rejected";
type StatusFilter = ResourceStatus | "all";

type AdminResource = {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  image?: string | null;
  resourceType: string;
  createdAt: string;
  status: ResourceStatus;
  rejectionReason?: string | null;
  tags: string[];
  techStack: string[];
  addedBy: {
    name: string;
    avatar?: string | null;
  };
};

type AdminResourcesResponse = {
  status: number;
  data: unknown[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type ResourceOptionsResponse = {
  data: {
    resourceTypes: { id: string; name: string; label: string }[];
  };
};

const statusConfig: Record<
  ResourceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

function normalizeResource(raw: any): AdminResource {
  const statusValue: ResourceStatus =
    raw?.status === "approved" || raw?.status === "rejected"
      ? raw.status
      : "pending";

  const resourceType =
    typeof raw?.resourceType === "string"
      ? raw.resourceType
      : (raw?.resourceType?.name ??
        raw?.resourceTypeLabel ??
        raw?.resourceTypeId ??
        "unknown");

  const tags = Array.isArray(raw?.tags)
    ? raw.tags
        .map((tag: any) => (typeof tag === "string" ? tag : tag?.name))
        .filter(Boolean)
    : [];

  const techStack = Array.isArray(raw?.techStack)
    ? raw.techStack
        .map((tech: any) => (typeof tech === "string" ? tech : tech?.name))
        .filter(Boolean)
    : [];

  return {
    id: raw?.id ?? "",
    title: raw?.title ?? "Untitled resource",
    description: raw?.description ?? "",
    url: raw?.url ?? "",
    image: raw?.image ?? null,
    resourceType,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    status: statusValue,
    rejectionReason: raw?.reason ?? raw?.rejectionReason ?? null,
    tags,
    techStack,
    addedBy: {
      name: raw?.creator?.name ?? raw?.addedBy?.name ?? "Unknown user",
      avatar:
        raw?.creator?.image ??
        raw?.addedBy?.avatar ??
        raw?.addedBy?.image ??
        null,
    },
  };
}

const ResourceTable = () => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringEnum(["pending", "approved", "rejected", "all"]).withDefault(
      "all",
    ),
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "resourceType",
    parseAsString.withDefault("all"),
  );
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  );
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(20),
  );

  const debouncedSearch = useDebounce(searchQuery, 350);

  const [previewResource, setPreviewResource] = useState<AdminResource | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    resourceId: string;
  }>({ open: false, resourceId: "" });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    resourceId: string;
  }>({ open: false, resourceId: "" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    resourceId: string;
    title: string;
  }>({ open: false, resourceId: "", title: "" });
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: optionsData } = useQuery({
    queryKey: ["resourceOptions"],
    queryFn: async () => {
      const res = await resourceOptions();
      return (res.data as ResourceOptionsResponse).data;
    },
  });

  const {
    data: resourcesResponse,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: [
      "admin-resources",
      currentPage,
      limit,
      statusFilter,
      debouncedSearch,
      typeFilter,
    ],
    queryFn: async () => {
      const res = await getAdminResources({
        page: currentPage,
        limit,
        status: statusFilter as StatusFilter,
        search: debouncedSearch,
        resourceType: typeFilter,
      });
      return res.data as AdminResourcesResponse;
    },
  });

  const { mutateAsync: updateStatusMutation, isPending: isUpdatingStatus } =
    useMutation({
      mutationFn: async ({
        id,
        status,
        reason,
      }: {
        id: string;
        status: "approved" | "rejected";
        reason?: string;
      }) => updateAdminResourceStatus({ id, status, reason }),
      onSuccess: (_, variables) => {
        toast.success(
          variables.status === "approved"
            ? "Resource approved successfully"
            : "Resource rejected successfully",
        );
        queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      },
      onError: (err) => {
        toast.error(
          (err as any)?.response?.data?.message ??
            "Failed to update resource status",
        );
      },
    });

  const { mutateAsync: deleteResourceMutation, isPending: isDeletingResource } =
    useMutation({
      mutationFn: async (id: string) => deleteAdminResource(id),
      onSuccess: () => {
        toast.success("Resource deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      },
      onError: (err) => {
        toast.error(
          (err as any)?.response?.data?.message ?? "Failed to delete resource",
        );
      },
    });

  const resources = useMemo(
    () =>
      (resourcesResponse?.data ?? []).map((item) => normalizeResource(item)),
    [resourcesResponse?.data],
  );

  const totalCount = resourcesResponse?.meta.total ?? 0;

  const pendingCount = resources.filter(
    (resource) => resource.status === "pending",
  ).length;
  const approvedCount = resources.filter(
    (resource) => resource.status === "approved",
  ).length;
  const rejectedCount = resources.filter(
    (resource) => resource.status === "rejected",
  ).length;

  const totalPages = resourcesResponse?.meta.totalPages ?? 1;

  const paginatedResources = resources;

  const getResourceTypeLabel = (type: string) =>
    optionsData?.resourceTypes?.find(
      (resourceType) => resourceType.name === type,
    )?.label ?? type;

  const openConfirmDialog = (
    resourceId: string,
    action: "approve" | "reject",
  ) => {
    if (action === "approve") {
      setConfirmDialog({ open: true, resourceId });
      return;
    }
    setRejectDialog({ open: true, resourceId });
  };

  const handleApprove = async (id: string) => {
    if (!id) return;
    await updateStatusMutation({ id, status: "approved" });
    setConfirmDialog({ open: false, resourceId: "" });
  };

  const handleReject = async () => {
    if (!rejectDialog.resourceId) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Please provide a rejection reason");
      return;
    }
    await updateStatusMutation({
      id: rejectDialog.resourceId,
      status: "rejected",
      reason,
    });
    setRejectDialog({ open: false, resourceId: "" });
    setRejectionReason("");
  };

  const handleDelete = async () => {
    if (!deleteDialog.resourceId) return;
    await deleteResourceMutation(deleteDialog.resourceId);
    setDeleteDialog({ open: false, resourceId: "", title: "" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  const filtersApplied =
    searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  const isMutating = isUpdatingStatus || isDeletingResource;
  const loadingText =
    isFetching && !isLoading
      ? "Updating..."
      : isDeletingResource
        ? "Deleting resource..."
        : null;
  const rowCountStart = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const rowCountEnd = Math.min(currentPage * limit, totalCount);

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resources Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">Failed to load resources.</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["admin-resources"] })
            }
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {resourcesResponse?.meta.total ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review (Current Page)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved (Current Page)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected (Current Page)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {rejectedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resources Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(optionsData?.resourceTypes ?? []).map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>

            {filtersApplied && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading resources...
                    </TableCell>
                  </TableRow>
                ) : paginatedResources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No resources found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedResources.map((resource) => {
                    const StatusIcon = statusConfig[resource.status].icon;
                    return (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[250px]">
                              {resource.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                              {resource.url}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getResourceTypeLabel(resource.resourceType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={resource.addedBy.avatar ?? undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {resource.addedBy.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm whitespace-nowrap">
                              {resource.addedBy.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(resource.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusConfig[resource.status].variant}
                            className="gap-1 whitespace-nowrap"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[resource.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewResource(resource)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                window.open(
                                  resource.url,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                              title="Open URL"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {resource.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() =>
                                    openConfirmDialog(resource.id, "approve")
                                  }
                                  title="Approve"
                                  disabled={isMutating}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    openConfirmDialog(resource.id, "reject")
                                  }
                                  title="Reject"
                                  disabled={isMutating}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {resource.status !== "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isMutating}
                                onClick={() => {
                                  if (resource.status === "approved") {
                                    openConfirmDialog(resource.id, "reject");
                                  } else {
                                    openConfirmDialog(resource.id, "approve");
                                  }
                                }}
                              >
                                {resource.status === "approved"
                                  ? "Reject"
                                  : "Approve"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete Resource"
                              disabled={isMutating}
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  resourceId: resource.id,
                                  title: resource.title,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {loadingText && (
            <p className="text-xs text-muted-foreground mt-2">{loadingText}</p>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {rowCountStart} to {rowCountEnd} of {totalCount}{" "}
                resources
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from(
                    { length: Math.min(totalPages, 5) },
                    (_, index) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = index + 1;
                      } else if (currentPage <= 3) {
                        page = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + index;
                      } else {
                        page = currentPage - 2 + index;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage(page);
                            }}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    },
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage < totalPages)
                          setCurrentPage(currentPage + 1);
                      }}
                      aria-disabled={currentPage === totalPages}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Resource</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the resource visible to all users. Are you sure you
              want to approve it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleApprove(confirmDialog.resourceId)}
              disabled={isMutating}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          setRejectDialog((prev) => ({ ...prev, open }));
          if (!open) setRejectionReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejecting this resource. This will be visible to the user who submitted it."
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={4}
                disabled={isMutating}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The user will be notified about the rejection along with your
              feedback.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, resourceId: "" });
                setRejectionReason("");
              }}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isMutating}
            >
              Reject Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!previewResource}
        onOpenChange={() => setPreviewResource(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[88vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Resource Preview</DialogTitle>
          </DialogHeader>
          {previewResource && (
            <div className="space-y-4">
              {previewResource.image && (
                <img
                  src={previewResource.image}
                  alt={previewResource.title}
                  className="w-[50%] mx-auto h-48 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {previewResource.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewResource.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {getResourceTypeLabel(previewResource.resourceType)}
                </Badge>
                {previewResource.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
                {previewResource.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              {previewResource.status === "rejected" &&
                previewResource.rejectionReason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {previewResource.rejectionReason}
                    </p>
                  </div>
                )}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={previewResource.addedBy.avatar ?? undefined}
                    />
                    <AvatarFallback>
                      {previewResource.addedBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {previewResource.addedBy.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted on{" "}
                      {new Date(previewResource.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      previewResource.url,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Resource
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceTable;
