CREATE TYPE "public"."whatsapp_handover" AS ENUM('bot', 'humano');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_direction" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_type" AS ENUM('texto', 'template', 'outro');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"client_id" uuid,
	"phone" text,
	"wa_phone_number_id" text NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"handover" "whatsapp_handover" DEFAULT 'bot' NOT NULL,
	"opted_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbershop_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"wamid" text NOT NULL,
	"direction" "whatsapp_message_direction" NOT NULL,
	"type" "whatsapp_message_type" NOT NULL,
	"body" text,
	"status" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_barbershop_id_barbershops_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_whatsapp_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_conversations_barbershop_phone_idx" ON "whatsapp_conversations" USING btree ("barbershop_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_messages_wamid_idx" ON "whatsapp_messages" USING btree ("wamid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_conversation_idx" ON "whatsapp_messages" USING btree ("barbershop_id","conversation_id");