CREATE TABLE "resource_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resource_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_resource_type_resource_type_name_fk" FOREIGN KEY ("resource_type") REFERENCES "public"."resource_type"("name") ON DELETE no action ON UPDATE no action;