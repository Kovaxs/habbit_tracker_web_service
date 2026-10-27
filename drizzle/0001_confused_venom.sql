CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_name_unique` ON `profiles` (`name`);--> statement-breakpoint
INSERT INTO `profiles` (`id`, `name`, `created_at`) VALUES ('default', 'Personal', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));--> statement-breakpoint
CREATE TABLE `__backup_entries` AS SELECT `habit_id`, `date`, `slot`, `value` FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
DROP INDEX `habits_name_unique`;--> statement-breakpoint
CREATE TABLE `__new_habits` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
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
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "habit_kind" CHECK("__new_habits"."kind" in ('count', 'completion')),
	CONSTRAINT "habit_tracking" CHECK("__new_habits"."tracking" in ('daily', 'hourly')),
	CONSTRAINT "habit_direction" CHECK("__new_habits"."direction" in ('increase', 'decrease')),
	CONSTRAINT "habit_target" CHECK("__new_habits"."target" between 0 and 1000000 and typeof("__new_habits"."target") = 'integer'),
	CONSTRAINT "habit_completion" CHECK("__new_habits"."kind" != 'completion' or ("__new_habits"."target" = 1 and "__new_habits"."direction" = 'increase')),
	CONSTRAINT "habit_hours" CHECK("__new_habits"."start_hour" between 0 and 23 and "__new_habits"."end_hour" between 1 and 24 and "__new_habits"."start_hour" < "__new_habits"."end_hour" and "__new_habits"."review_hour" between 0 and 24)
);
--> statement-breakpoint
INSERT INTO `__new_habits` (`id`, `profile_id`, `name`, `kind`, `tracking`, `direction`, `target`, `unit`, `start_date`, `start_hour`, `end_hour`, `review_hour`, `archived`, `created_at`) SELECT `id`, 'default', `name`, `kind`, `tracking`, `direction`, `target`, `unit`, `start_date`, `start_hour`, `end_hour`, `review_hour`, `archived`, `created_at` FROM `habits`;--> statement-breakpoint
DROP TABLE `habits`;--> statement-breakpoint
ALTER TABLE `__new_habits` RENAME TO `habits`;--> statement-breakpoint
CREATE UNIQUE INDEX `habits_profile_name_unique` ON `habits` (`profile_id`,`name`);--> statement-breakpoint
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
INSERT INTO `entries` (`habit_id`, `date`, `slot`, `value`) SELECT `habit_id`, `date`, `slot`, `value` FROM `__backup_entries`;--> statement-breakpoint
DROP TABLE `__backup_entries`;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`profile_id` text NOT NULL,
	`date` text NOT NULL,
	`helped` text NOT NULL,
	`difficult` text NOT NULL,
	PRIMARY KEY(`profile_id`, `date`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "note_length" CHECK(length("__new_notes"."helped") <= 4000 and length("__new_notes"."difficult") <= 4000)
);
--> statement-breakpoint
INSERT INTO `__new_notes`(`profile_id`, `date`, `helped`, `difficult`) SELECT 'default', `date`, `helped`, `difficult` FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;
