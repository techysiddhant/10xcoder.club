CREATE TABLE "user_upvote" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "credits" text;--> statement-breakpoint
ALTER TABLE "user_upvote" ADD CONSTRAINT "user_upvote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_upvote" ADD CONSTRAINT "user_upvote_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_resource_upvote_idx" ON "user_upvote" USING btree ("user_id","resource_id");