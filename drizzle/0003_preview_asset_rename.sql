ALTER TABLE "design_concepts" RENAME COLUMN "reference_asset_id" TO "preview_asset_id";--> statement-breakpoint
ALTER TABLE "design_concepts" DROP CONSTRAINT IF EXISTS "design_concepts_reference_asset_id_design_assets_id_fk";--> statement-breakpoint
ALTER TABLE "design_concepts" ADD CONSTRAINT "design_concepts_preview_asset_id_design_assets_id_fk" FOREIGN KEY ("preview_asset_id") REFERENCES "public"."design_assets"("id") ON DELETE set null ON UPDATE no action;
