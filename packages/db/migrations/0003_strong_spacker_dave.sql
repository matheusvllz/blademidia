CREATE TYPE "public"."app_user_role" AS ENUM('dono', 'funcionario');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_settings" (
	"barbershop_id" uuid PRIMARY KEY NOT NULL,
	"threshold_visits" integer DEFAULT 6 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_id" uuid
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "loyalty_baseline_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_users" ADD COLUMN "role" "app_user_role" DEFAULT 'dono' NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_users" ADD COLUMN "barber_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_settings" ADD CONSTRAINT "loyalty_settings_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_redemptions_client_idx" ON "loyalty_redemptions" USING btree ("barbershop_id","client_id","redeemed_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_users" ADD CONSTRAINT "crm_users_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_users_barber_id_idx" ON "crm_users" USING btree ("barber_id") WHERE "crm_users"."barber_id" is not null;