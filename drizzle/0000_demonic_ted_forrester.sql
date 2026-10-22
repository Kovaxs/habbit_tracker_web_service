CREATE TABLE `entries` (
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`slot` integer NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`habit_id`, `date`, `slot`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "entry_value" CHECK("entries"."value" between 0 and 1000000 and typeof("entries"."value") = 'integer'),
	CONSTRAINT "entry_slot" CHECK("entries"."slot" between -1 and 23 and typeof("entries"."slot") = 'integer')
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`tracking` text NOT NULL,
	`direction` text NOT NULL,
	`target` integer NOT NULL,
	`unit` text NOT NULL,
	`start_date` text NOT NULL,
	`start_hour` integer NOT NULL,
	`end_hour` integer NOT NULL,
	`review_hour` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "habit_kind" CHECK("habits"."kind" in ('count', 'completion')),
	CONSTRAINT "habit_tracking" CHECK("habits"."tracking" in ('daily', 'hourly')),
	CONSTRAINT "habit_direction" CHECK("habits"."direction" in ('increase', 'decrease')),
	CONSTRAINT "habit_target" CHECK("habits"."target" between 0 and 1000000 and typeof("habits"."target") = 'integer'),
	CONSTRAINT "habit_completion" CHECK("habits"."kind" != 'completion' or ("habits"."target" = 1 and "habits"."direction" = 'increase')),
	CONSTRAINT "habit_hours" CHECK("habits"."start_hour" between 0 and 23 and "habits"."end_hour" between 1 and 24 and "habits"."start_hour" < "habits"."end_hour" and "habits"."review_hour" between 0 and 24)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habits_name_unique` ON `habits` (`name`);--> statement-breakpoint
CREATE TABLE `notes` (
	`date` text PRIMARY KEY NOT NULL,
	`helped` text NOT NULL,
	`difficult` text NOT NULL,
	CONSTRAINT "note_length" CHECK(length("notes"."helped") <= 4000 and length("notes"."difficult") <= 4000)
);
