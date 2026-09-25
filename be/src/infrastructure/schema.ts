import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  people: integer("people").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const costLines = pgTable("cost_lines", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id")
    .notNull()
    .references(() => proposals.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
  priceBasis: text("price_basis"),
  priceCents: integer("price_cents"),
  outboundFrom: text("outbound_from"),
  outboundTo: text("outbound_to"),
  returnFrom: text("return_from"),
  returnTo: text("return_to"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});
