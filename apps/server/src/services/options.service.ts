/**
 * Options Service
 * Fetches available options for resource creation forms
 */

import { db } from "@/db";
import { resourceType, tag, techStack } from "@workspace/database";

/**
 * Shape of the resource options returned by getResourceOptions
 */
export interface ResourceOptions {
  resourceTypes: {
    id: string;
    name: string;
    label: string;
    icon: string | null;
  }[];
  tags: { id: string; name: string }[];
  techStack: { id: string; name: string }[];
}

/**
 * Get all options for resource form dropdowns
 */
export async function getResourceOptions(): Promise<ResourceOptions> {
  const [resourceTypes, tags, techStacks] = await Promise.all([
    db.select().from(resourceType).orderBy(resourceType.name),
    db.select().from(tag).orderBy(tag.name),
    db.select().from(techStack).orderBy(techStack.name),
  ]);

  return {
    resourceTypes: resourceTypes.map((rt) => ({
      id: rt.id,
      name: rt.name,
      label: rt.label,
      icon: rt.icon,
    })),
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
    })),
    techStack: techStacks.map((ts) => ({
      id: ts.id,
      name: ts.name,
    })),
  };
}
