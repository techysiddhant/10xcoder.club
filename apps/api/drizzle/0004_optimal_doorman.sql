CREATE TYPE "public"."vote_type" AS ENUM('upvote', 'downvote');--> statement-breakpoint
ALTER TABLE "user_upvote" RENAME TO "user_vote";--> statement-breakpoint
ALTER TABLE "user_vote" DROP CONSTRAINT "user_upvote_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_vote" DROP CONSTRAINT "user_upvote_resource_id_resource_id_fk";
--> statement-breakpoint
DROP INDEX "user_resource_upvote_idx";--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "downvote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vote" ADD COLUMN "type" "vote_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vote" ADD CONSTRAINT "user_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vote" ADD CONSTRAINT "user_vote_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_resource_vote_idx" ON "user_vote" USING btree ("user_id","resource_id");