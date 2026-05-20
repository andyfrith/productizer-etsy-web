CREATE TABLE "design_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_id" uuid,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"card_key" text NOT NULL,
	"full_key" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "design_concepts" ADD COLUMN "reference_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_concept_id_design_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."design_concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_concepts" ADD CONSTRAINT "design_concepts_reference_asset_id_design_assets_id_fk" FOREIGN KEY ("reference_asset_id") REFERENCES "public"."design_assets"("id") ON DELETE set null ON UPDATE no action;