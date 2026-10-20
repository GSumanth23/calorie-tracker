CREATE TYPE "public"."food_source" AS ENUM('SEED', 'USDA', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."meal" AS ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"food_id" uuid,
	"date" date NOT NULL,
	"meal" "meal" NOT NULL,
	"servings" real NOT NULL,
	"food_name" text NOT NULL,
	"serving" text NOT NULL,
	"calories" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "food_source" NOT NULL,
	"external_id" text,
	"user_id" uuid,
	"name" text NOT NULL,
	"brand" text,
	"serving_size" real NOT NULL,
	"serving_unit" text NOT NULL,
	"calories" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"calories" integer DEFAULT 2000 NOT NULL,
	"protein" integer DEFAULT 120 NOT NULL,
	"carbs" integer DEFAULT 220 NOT NULL,
	"fat" integer DEFAULT 70 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_logs_user_date_idx" ON "food_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_external_idx" ON "foods" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "foods_user_idx" ON "foods" USING btree ("user_id");