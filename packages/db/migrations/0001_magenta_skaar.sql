CREATE TYPE "public"."exception_kind" AS ENUM('folga', 'bloqueio', 'extra');--> statement-breakpoint
CREATE TYPE "public"."appointment_source" AS ENUM('painel', 'bot', 'importacao');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('agendado', 'confirmado', 'concluido', 'cancelado', 'faltou');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "barbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_min" integer NOT NULL,
	"price_cents" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "barber_services" (
	"barbershop_id" uuid NOT NULL,
	"barber_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "barber_services_barber_id_service_id_pk" PRIMARY KEY("barber_id","service_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"barber_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"barber_id" uuid,
	"date" date NOT NULL,
	"kind" "exception_kind" NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"barber_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'agendado' NOT NULL,
	"source" "appointment_source" DEFAULT 'painel' NOT NULL,
	"notes" text,
	"visit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_settings" (
	"barbershop_id" uuid PRIMARY KEY NOT NULL,
	"slot_step_min" integer DEFAULT 30 NOT NULL,
	"min_advance_min" integer DEFAULT 0 NOT NULL,
	"no_show_after_min" integer DEFAULT 30 NOT NULL,
	"confirmation_lead_hours" integer DEFAULT 24 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "barbershops" ADD COLUMN "timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "service_id" uuid;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "staff_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barbers" ADD CONSTRAINT "barbers_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agenda_settings" ADD CONSTRAINT "agenda_settings_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_schedules_barber_weekday_idx" ON "work_schedules" USING btree ("barbershop_id","barber_id","weekday");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_exceptions_date_idx" ON "schedule_exceptions" USING btree ("barbershop_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_barber_starts_idx" ON "appointments" USING btree ("barbershop_id","barber_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_client_idx" ON "appointments" USING btree ("barbershop_id","client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_status_starts_idx" ON "appointments" USING btree ("barbershop_id","status","starts_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_staff_id_barbers_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- SQL manual (não gerado pelo Drizzle): ausência de double booking garantida no
-- banco (Decision 5 do design.md). Dois agendamentos ATIVOS do mesmo barbeiro
-- não podem ter intervalos [starts_at, ends_at) sobrepostos. Estados
-- cancelado/faltou/concluido não bloqueiam reuso do horário (predicado parcial).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
   EXCLUDE USING gist (
     "barber_id" WITH =,
     tstzrange("starts_at", "ends_at", '[)') WITH &&
   ) WHERE (status IN ('agendado', 'confirmado'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
