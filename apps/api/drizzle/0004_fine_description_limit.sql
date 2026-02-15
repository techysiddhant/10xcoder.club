ALTER TABLE "resource" DROP CONSTRAINT IF EXISTS "resource_description_max_5000_chk";--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_description_max_5000_chk" CHECK ("description" IS NULL OR char_length("description") <= 5000);
