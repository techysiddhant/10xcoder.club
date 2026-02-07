import { ResourceLanguage } from "@workspace/schemas";

export interface GetResourcesParams {
  cursor?: string;
  limit?: number;
  resourceType?: string;
  language?: ResourceLanguage;
  tag?: string | string[];
  techStack?: string | string[];
  search?: string;
}

/** Tag/tech from API list (id + name) */
export interface ResourceTagRef {
  id: string;
  name: string;
}

/** Creator from API list */
export interface ResourceCreatorRef {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
}

/** Single item from GET /api/resources list response */
export interface ResourceListItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  credits: string | null;
  resourceType: string;
  language: string;
  status: string;
  upvoteCount: number;
  downvoteCount: number;
  userVote: "upvote" | "downvote" | null;
  createdAt: string;
  updatedAt: string;
  tags: ResourceTagRef[];
  techStack: ResourceTagRef[];
  creator: ResourceCreatorRef;
  /** When true, backend blocks deletion; UI should disable delete for published items */
  isPublished: boolean;
}

/** Response shape of GET /api/resources */
export interface GetResourcesResponse {
  status: number;
  data: ResourceListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Playlist item for video resources */
export interface ResourcePlaylistItem {
  title: string;
  url: string;
  duration?: string;
}

/** Single resource from GET /api/resources/:id (detail view) */
export interface ResourceDetailItem extends ResourceListItem {
  resourceType:
    | "article"
    | "video"
    | "template"
    | "tool"
    | "course"
    | "podcast";
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  playlist?: ResourcePlaylistItem[];
  addedBy: { name: string | null; image: string | null };
}
