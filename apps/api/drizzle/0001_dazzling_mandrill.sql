CREATE TYPE "public"."language" AS ENUM('english', 'hindi');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('approved', 'rejected', 'pending');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('upvote', 'downvote');--> statement-breakpoint
CREATE TABLE "resource" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"image" text,
	"credits" text,
	"resource_type_id" text NOT NULL,
	"language" "language" DEFAULT 'english' NOT NULL,
	"status" "resource_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"downvote_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"embedding" vector(768),
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "resource_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resource_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tech_stack" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tech_stack_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "resource_to_tags" (
	"resource_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "resource_to_tags_resource_id_tag_id_pk" PRIMARY KEY("resource_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "resource_to_tech_stack" (
	"resource_id" text NOT NULL,
	"tech_stack_id" text NOT NULL,
	CONSTRAINT "resource_to_tech_stack_resource_id_tech_stack_id_pk" PRIMARY KEY("resource_id","tech_stack_id")
);
--> statement-breakpoint
CREATE TABLE "user_vote" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"type" "vote_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "user_email_idx";--> statement-breakpoint
DROP INDEX "user_username_idx";--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_resource_type_id_resource_type_id_fk" FOREIGN KEY ("resource_type_id") REFERENCES "public"."resource_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tags" ADD CONSTRAINT "resource_to_tags_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tags" ADD CONSTRAINT "resource_to_tags_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" ADD CONSTRAINT "resource_to_tech_stack_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" ADD CONSTRAINT "resource_to_tech_stack_tech_stack_id_tech_stack_id_fk" FOREIGN KEY ("tech_stack_id") REFERENCES "public"."tech_stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vote" ADD CONSTRAINT "user_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vote" ADD CONSTRAINT "user_vote_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_status_idx" ON "resource" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resource_created_by_idx" ON "resource" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "resource_deleted_at_idx" ON "resource" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "resource_type_id_idx" ON "resource" USING btree ("resource_type_id");--> statement-breakpoint
CREATE INDEX "resource_embedding_hnsw_idx" ON "resource" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_resource_vote_idx" ON "user_vote" USING btree ("user_id","resource_id");