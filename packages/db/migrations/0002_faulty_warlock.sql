CREATE TABLE IF NOT EXISTS "report_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"revenue_cents" integer DEFAULT 0 NOT NULL,
	"visits_count" integer DEFAULT 0 NOT NULL,
	"avg_ticket_cents" integer,
	"new_clients_count" integer DEFAULT 0 NOT NULL,
	"served_clients_count" integer DEFAULT 0 NOT NULL,
	"occupied_count" integer DEFAULT 0 NOT NULL,
	"capacity_count" integer DEFAULT 0 NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"canceled_count" integer DEFAULT 0 NOT NULL,
	"top_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_barbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reactivated_count" integer,
	"no_show_prevented_count" integer,
	"bot_messages_count" integer,
	"recovered_revenue_cents" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_snapshots_shop_year_month_idx" ON "report_snapshots" USING btree ("barbershop_id","year","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_snapshots_shop_idx" ON "report_snapshots" USING btree ("barbershop_id");