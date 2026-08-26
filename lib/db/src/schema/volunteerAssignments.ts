import { pgTable, uuid, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { adminsTable } from "./admins";
import { festivalsTable } from "./festivals";
import { eventsTable } from "./events";

export const volunteerFestivalAssignmentsTable = pgTable("volunteer_festival_assignments", {
  volunteerId: uuid("volunteer_id").notNull().references(() => adminsTable.id, { onDelete: "cascade" }),
  festivalId: integer("festival_id").notNull().references(() => festivalsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueAssignment: uniqueIndex("uq_volunteer_festival_assignment").on(table.volunteerId, table.festivalId),
  volunteerIndex: index("idx_volunteer_festival_volunteer").on(table.volunteerId),
  festivalIndex: index("idx_volunteer_festival_festival").on(table.festivalId),
}));

export const volunteerEventAssignmentsTable = pgTable("volunteer_event_assignments", {
  volunteerId: uuid("volunteer_id").notNull().references(() => adminsTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueAssignment: uniqueIndex("uq_volunteer_event_assignment").on(table.volunteerId, table.eventId),
  volunteerIndex: index("idx_volunteer_event_volunteer").on(table.volunteerId),
  eventIndex: index("idx_volunteer_event").on(table.eventId),
}));
