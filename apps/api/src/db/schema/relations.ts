import { relations } from "drizzle-orm";
import { resource } from "./resource";
import { resourceType } from "./resourceType";
import { tag } from "./tag";
import { techStack } from "./techStack";
import { resourceToTags } from "./resourceToTags";
import { resourceToTechStack } from "./resourceToTechStack";
import { user } from "./user";

// Resource relations
export const resourceRelations = relations(resource, ({ one, many }) => ({
  creator: one(user, {
    fields: [resource.createdBy],
    references: [user.id],
  }),
  resourceType: one(resourceType, {
    fields: [resource.resourceTypeId],
    references: [resourceType.id],
  }),
  resourceToTags: many(resourceToTags),
  resourceToTechStack: many(resourceToTechStack),
}));

// ResourceType relations
export const resourceTypeRelations = relations(resourceType, ({ many }) => ({
  resources: many(resource),
}));

// Tag relations
export const tagRelations = relations(tag, ({ many }) => ({
  resourceToTags: many(resourceToTags),
}));

// TechStack relations
export const techStackRelations = relations(techStack, ({ many }) => ({
  resourceToTechStack: many(resourceToTechStack),
}));

// ResourceToTags junction relations
export const resourceToTagsRelations = relations(resourceToTags, ({ one }) => ({
  resource: one(resource, {
    fields: [resourceToTags.resourceId],
    references: [resource.id],
  }),
  tag: one(tag, {
    fields: [resourceToTags.tagId],
    references: [tag.id],
  }),
}));

// ResourceToTechStack junction relations
export const resourceToTechStackRelations = relations(
  resourceToTechStack,
  ({ one }) => ({
    resource: one(resource, {
      fields: [resourceToTechStack.resourceId],
      references: [resource.id],
    }),
    techStack: one(techStack, {
      fields: [resourceToTechStack.techStackId],
      references: [techStack.id],
    }),
  }),
);
