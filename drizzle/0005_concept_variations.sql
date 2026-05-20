CREATE TABLE "concept_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_id" uuid NOT NULL,
	"parent_variation_id" uuid,
	"source_asset_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"prompt_snapshot" text,
	"storage_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"card_key" text NOT NULL,
	"full_key" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "design_concepts" ADD COLUMN "approved_variation_id" uuid;
--> statement-breakpoint
ALTER TABLE "concept_variations" ADD CONSTRAINT "concept_variations_concept_id_design_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."design_concepts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concept_variations" ADD CONSTRAINT "concept_variations_parent_variation_id_concept_variations_id_fk" FOREIGN KEY ("parent_variation_id") REFERENCES "public"."concept_variations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "concept_variations" ADD CONSTRAINT "concept_variations_source_asset_id_design_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."design_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "design_concepts" ADD CONSTRAINT "design_concepts_approved_variation_id_concept_variations_id_fk" FOREIGN KEY ("approved_variation_id") REFERENCES "public"."concept_variations"("id") ON DELETE set null ON UPDATE no action;
