export * from "./schema";

// Type helpers (client-friendly)
export type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Convenience per-table model types (select/insert)
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  account,
  resource,
  resourceToTags,
  resourceToTechStack,
  resourceType,
  session,
  tag,
  techStack,
  user,
  userVote,
  verification,
} from "./schema";

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;

export type Resource = InferSelectModel<typeof resource>;
export type NewResource = InferInsertModel<typeof resource>;

export type ResourceType = InferSelectModel<typeof resourceType>;
export type NewResourceType = InferInsertModel<typeof resourceType>;

export type Tag = InferSelectModel<typeof tag>;
export type NewTag = InferInsertModel<typeof tag>;

export type TechStack = InferSelectModel<typeof techStack>;
export type NewTechStack = InferInsertModel<typeof techStack>;

export type ResourceToTags = InferSelectModel<typeof resourceToTags>;
export type NewResourceToTags = InferInsertModel<typeof resourceToTags>;

export type ResourceToTechStack = InferSelectModel<typeof resourceToTechStack>;
export type NewResourceToTechStack = InferInsertModel<
  typeof resourceToTechStack
>;

export type UserVote = InferSelectModel<typeof userVote>;
export type NewUserVote = InferInsertModel<typeof userVote>;

export type ResourceAutoFillMeta = {
  platform: "youtube" | "github" | "devto" | "hashnode" | "generic";
  method: "api" | "graphql" | "og_meta";
  cached: boolean;
  videoId?: string;
  channelUrl?: string;
  duration?: string;
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
  playlistId?: string;
  playlistTitle?: string;
  videoCount?: number;
  playlistVideos?: {
    position: number;
    videoId: string;
    title: string;
    thumbnail: string;
    duration?: string;
  }[];
  repoName?: string;
  stars?: number;
  repoLanguage?: string;
  topics?: string[];
  readingTime?: number;
  publishedAt?: string;
};

export type ResourceAutoFillData = {
  title: string;
  description: string;
  url: string;
  image: string;
  credits: string;
  resourceType: "video" | "blog" | "tool" | "repo";
  language: "english";
  tags: string[];
  techStack: string[];
  _meta: ResourceAutoFillMeta;
};

export type ResourceAutoFillResponse = {
  success: true;
  data: ResourceAutoFillData;
};
