CREATE TABLE "rate_limit_buckets" (
	"key" text NOT NULL,
	"window" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_window_pk" PRIMARY KEY("key","window")
);
