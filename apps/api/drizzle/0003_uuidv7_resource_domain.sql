ALTER TABLE "resource" DROP CONSTRAINT IF EXISTS "resource_resource_type_id_resource_type_id_fk";--> statement-breakpoint
ALTER TABLE "resource_to_tags" DROP CONSTRAINT IF EXISTS "resource_to_tags_resource_id_resource_id_fk";--> statement-breakpoint
ALTER TABLE "resource_to_tags" DROP CONSTRAINT IF EXISTS "resource_to_tags_tag_id_tag_id_fk";--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" DROP CONSTRAINT IF EXISTS "resource_to_tech_stack_resource_id_resource_id_fk";--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" DROP CONSTRAINT IF EXISTS "resource_to_tech_stack_tech_stack_id_tech_stack_id_fk";--> statement-breakpoint
ALTER TABLE "user_vote" DROP CONSTRAINT IF EXISTS "user_vote_resource_id_resource_id_fk";--> statement-breakpoint
ALTER TABLE "resource_type" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "tag" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "tech_stack" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "user_vote" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "resource_type_id" TYPE uuid USING "resource_type_id"::uuid;--> statement-breakpoint
ALTER TABLE "resource_to_tags" ALTER COLUMN "resource_id" TYPE uuid USING "resource_id"::uuid;--> statement-breakpoint
ALTER TABLE "resource_to_tags" ALTER COLUMN "tag_id" TYPE uuid USING "tag_id"::uuid;--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" ALTER COLUMN "resource_id" TYPE uuid USING "resource_id"::uuid;--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" ALTER COLUMN "tech_stack_id" TYPE uuid USING "tech_stack_id"::uuid;--> statement-breakpoint
ALTER TABLE "user_vote" ALTER COLUMN "resource_id" TYPE uuid USING "resource_id"::uuid;--> statement-breakpoint
ALTER TABLE "resource_type" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "tag" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "tech_stack" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "user_vote" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_resource_type_id_resource_type_id_fk" FOREIGN KEY ("resource_type_id") REFERENCES "public"."resource_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tags" ADD CONSTRAINT "resource_to_tags_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tags" ADD CONSTRAINT "resource_to_tags_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" ADD CONSTRAINT "resource_to_tech_stack_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_to_tech_stack" ADD CONSTRAINT "resource_to_tech_stack_tech_stack_id_tech_stack_id_fk" FOREIGN KEY ("tech_stack_id") REFERENCES "public"."tech_stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vote" ADD CONSTRAINT "user_vote_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;
