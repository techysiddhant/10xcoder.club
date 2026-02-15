"use client";

import { ResourceStatus } from "@workspace/schemas";
import { CheckCircle, Clock, Info, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Search } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ResourceListItem } from "@/lib/types";
import { useCallback } from "react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import { Eye } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { Pencil } from "lucide-react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { AlertDialogCancel } from "@workspace/ui/components/alert-dialog";
import { AlertDialogAction } from "@workspace/ui/components/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { useRouter } from "next/navigation";
import { deleteResource } from "@/lib/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
const statusConfig: Record<
  ResourceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

function getStatusConfig(status: string) {
  return statusConfig[status as ResourceStatus] ?? statusConfig.pending;
}
interface ResponseData {
  data: ResourceListItem[];
  kpis: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
type SubmissionStatus = "approved" | "rejected" | "pending" | "all";

interface UserSubmissionsProps {
  data: ResponseData;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTypes: string;
  setSelectedTypes: (value: string) => void;
  selectedStatus: SubmissionStatus;
  setSelectedStatus: (value: SubmissionStatus) => void;
  page: number;
  setPage: (value: number) => void;
  limit: number;
  setLimit: (value: number) => void;
  resourceTypes: { id: string; name: string; label: string }[];
}

const UserSubmissions = ({
  data,
  resourceTypes,
  searchQuery,
  setSearchQuery,
  selectedTypes,
  setSelectedTypes,
  selectedStatus,
  setSelectedStatus,
  page,
  setPage,
  limit,
  setLimit,
}: UserSubmissionsProps) => {
  const resources = data.data;
  const { total: totalCount, page: currentPage, limit: pageSize } = data.meta;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const getResourceTypeLabel = (type: string) => {
    return resourceTypes.find((t) => t.name === type)?.label ?? type;
  };
  const queryClient = useQueryClient();
  const { mutateAsync: deleteResourceMutation } = useMutation({
    mutationFn: async (id: string) => await deleteResource(id),
    onSuccess: () => {
      toast.success("Resource deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["user-submissions"] });
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || "Failed to delete resource",
      );
    },
  });
  const {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    total: kpiTotal,
  } = data.kpis;

  const canEdit = (resource: ResourceListItem) =>
    resource.status !== "approved";
  const canDelete = (resource: ResourceListItem) =>
    resource.status !== "approved" && !resource.isPublished;

  const router = useRouter();

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedTypes("all");
    setSelectedStatus("all");
    setPage(1);
  }, [setSearchQuery, setSelectedTypes, setSelectedStatus, setPage]);

  const filtersApplied =
    searchQuery.trim() !== "" ||
    selectedTypes !== "all" ||
    selectedStatus !== "all";

  const onEdit = (resource: ResourceListItem) => {
    router.push(`/resources/${resource.id}/edit`);
  };
  const onDelete = (resource: ResourceListItem) => {
    deleteResourceMutation(resource.id);
  };
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpiTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {rejectedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>My Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedStatus}
              onValueChange={(v) => {
                setSelectedStatus(v as SubmissionStatus);
                setPage(1);
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
              value={selectedTypes}
              onValueChange={(v) => {
                setSelectedTypes(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {resourceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtersApplied && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No submissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((resource) => {
                    const config = getStatusConfig(resource.status);
                    const StatusIcon = config.icon;
                    // const isRejected = resource.status === 'rejected' && resource.rejectionReason;

                    return (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px] sm:max-w-[250px]">
                              {resource.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[250px]">
                              {resource.url}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">
                            {getResourceTypeLabel(resource.resourceType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {new Date(resource.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={config.variant}
                              className="gap-1 whitespace-nowrap"
                            >
                              <StatusIcon className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                {config.label}
                              </span>
                            </Badge>
                            {resource.status === "rejected" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Info className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">
                                      Why?
                                    </span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-destructive">
                                      <XCircle className="h-5 w-5" />
                                      Rejection Reason
                                    </DialogTitle>
                                    <DialogDescription className="text-left pt-2">
                                      Your submission "
                                      <span className="font-medium text-foreground">
                                        {resource.title}
                                      </span>
                                      " was rejected for the following reason:
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-2">
                                    <p className="text-sm text-foreground">
                                      {resource.reason}
                                    </p>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    You can edit and resubmit this resource to
                                    address the feedback above.
                                  </p>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      router.push(`/resources/${resource.id}`)
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open URL</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {canEdit(resource) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-primary hover:text-primary hover:bg-primary/10"
                                      onClick={() => onEdit(resource)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit Resource</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-not-allowed">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        className="text-muted-foreground pointer-events-none"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Cannot edit approved resources
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Delete Button */}
                            {canDelete(resource) ? (
                              <AlertDialog>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Delete Resource
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Submission
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {resource.title}"? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      size="sm"
                                      variant="outline"
                                    >
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      size="sm"
                                      variant="destructive"
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => onDelete?.(resource)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-not-allowed">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        className="text-muted-foreground pointer-events-none"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Cannot delete published resources
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                submissions
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setPage(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={pageNum === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNum);
                          }}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setPage(currentPage + 1);
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
    </div>
  );
};

export default UserSubmissions;
