CREATE TABLE IF NOT EXISTS "reactivation_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wamid" text NOT NULL,
	"client_last_visit_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "crm_settings" ADD COLUMN "reactivation_automation_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_settings" ADD COLUMN "reactivation_daily_cap" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reactivation_sends" ADD CONSTRAINT "reactivation_sends_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reactivation_sends" ADD CONSTRAINT "reactivation_sends_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
