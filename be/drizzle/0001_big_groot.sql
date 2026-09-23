ALTER TABLE "cost_lines" ADD COLUMN "price_basis" text;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD COLUMN "outbound_from" text;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD COLUMN "outbound_to" text;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD COLUMN "return_from" text;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD COLUMN "return_to" text;